#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadFixture, writeRemarkableFixture } from "./lib/fixture.mjs";

const repository = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
);
const options = {
    outDir: path.join(repository, "apps/power-image-writer/docs/comparison"),
};
const arguments_ = process.argv
    .slice(2)
    .filter((argument) => argument !== "--");
for (let index = 0; index < arguments_.length; index++) {
    const option = arguments_[index];
    const value = arguments_[++index];
    if (!value || !["--before-ref", "--out-dir"].includes(option)) {
        throw new Error(
            "Usage: screenshots:remarkable:compare --before-ref <git-ref> [--out-dir <path>]",
        );
    }
    if (option === "--before-ref") options.beforeRef = value;
    else options.outDir = path.resolve(value);
}
if (!options.beforeRef)
    throw new Error("--before-ref is required; choose the baseline explicitly");

function run(command, args, cwd = repository) {
    return execFileSync(command, args, {
        cwd,
        stdio: ["ignore", "pipe", "inherit"],
        timeout: 120000,
    });
}

function panel(source, label, destination, width) {
    run("magick", [
        source,
        "-resize",
        `${width}x`,
        "-background",
        "white",
        "-gravity",
        "center",
        "-splice",
        "0x48",
        "-font",
        "DejaVu-Sans",
        "-pointsize",
        "24",
        "-fill",
        "black",
        "-gravity",
        "north",
        "-annotate",
        "+0+10",
        label,
        destination,
    ]);
}

function renderPowerScreen(source, fixtureDirectory, fixture, state, output) {
    const native = existsSync(
        path.join(source, "apps/power-image-writer/CMakeLists.txt"),
    );
    const binary = native
        ? "apps/power-image-writer/build/host/power-image-writer"
        : "apps/remarkable/tools/suspend-writer/build/suspend-writer";
    const args = native
        ? ["preview", "--app-dir", fixtureDirectory, "--date", fixture.today]
        : ["--today", fixture.today];
    args.push(
        "--roster",
        path.join(fixtureDirectory, "roster.json"),
        "--month",
        path.join(fixtureDirectory, `${fixture.today.slice(0, 7)}.json`),
        "--state",
        state,
        "--out",
        output,
    );
    run(path.join(source, binary), args);
    run("magick", [output, "-rotate", "-90", output]);
}

function renderSettings(source, fixtureDirectory, fixture, settings, output) {
    run(
        path.join(
            source,
            "apps/remarkable/tools/readme-screenshots/build/readme-screenshot",
        ),
        [
            "--scenario",
            "settings",
            "--data-dir",
            fixtureDirectory,
            "--settings",
            path.join(fixtureDirectory, settings),
            "--sync",
            path.join(fixtureDirectory, "sync.json"),
            "--today",
            fixture.today,
            "--out",
            output,
        ],
    );
}

const baseline = run("git", [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${options.beforeRef}^{commit}`,
])
    .toString()
    .trim();
const temporary = await mkdtemp(
    path.join(os.tmpdir(), "power-image-comparison-"),
);
try {
    const before = path.join(temporary, "before");
    const data = path.join(temporary, "data");
    await Promise.all([
        mkdir(before),
        mkdir(data),
        mkdir(options.outDir, { recursive: true }),
    ]);
    const hasNativeWriter =
        spawnSync(
            "git",
            [
                "cat-file",
                "-e",
                `${baseline}:apps/power-image-writer/CMakeLists.txt`,
            ],
            { cwd: repository, stdio: "ignore" },
        ).status === 0;
    const sources = ["apps/remarkable"];
    if (hasNativeWriter) sources.push("apps/power-image-writer");
    const archive = execFileSync("git", ["archive", baseline, ...sources], {
        cwd: repository,
        maxBuffer: 32 * 1024 * 1024,
    });
    execFileSync("tar", ["-xf", "-", "-C", before], { input: archive });
    run(
        "make",
        [
            "-C",
            "apps/remarkable",
            "suspend-writer-host",
            "readme-screenshot-host",
        ],
        before,
    );
    run("make", [
        "-C",
        "apps/remarkable",
        "power-image-writer-host",
        "readme-screenshot-host",
    ]);

    const fixture = await loadFixture(
        path.join(repository, "tools/readme-screenshots/fixture.json"),
    );
    await writeRemarkableFixture(fixture, data);
    const rows = [];
    const metrics = {};
    for (const state of [
        "sleep",
        "off",
        "empty",
        "starting",
        "rebooting",
        "overheating",
    ]) {
        const images = [];
        for (const [label, source] of [
            ["before", before],
            ["after", repository],
        ]) {
            const output = path.join(options.outDir, `${label}-${state}.png`);
            renderPowerScreen(source, data, fixture, state, output);
            const framed = path.join(temporary, `${label}-${state}.png`);
            panel(output, `${state} · ${label}`, framed, 700);
            images.push(framed);
        }
        const row = path.join(temporary, `${state}.png`);
        run("magick", [...images, "+append", row]);
        rows.push(row);
        const difference = spawnSync(
            "magick",
            [
                "compare",
                "-metric",
                "MAE",
                path.join(options.outDir, `before-${state}.png`),
                path.join(options.outDir, `after-${state}.png`),
                "null:",
            ],
            { encoding: "utf8", timeout: 30000 },
        );
        if (difference.status !== 0 && difference.status !== 1)
            throw new Error(difference.stderr);
        metrics[state] = difference.stderr.trim();
    }
    // Two columns of paired states keep the overview small; full-size images remain beside it.
    const rowPairs = [];
    for (let index = 0; index < rows.length; index += 2) {
        const pair = path.join(temporary, `pair-${index}.png`);
        run("magick", [rows[index], rows[index + 1], "+append", pair]);
        rowPairs.push(pair);
    }
    run("magick", [
        ...rowPairs,
        "-append",
        path.join(options.outDir, "power-states.png"),
    ]);

    renderSettings(
        before,
        data,
        fixture,
        "settings.json",
        path.join(options.outDir, "before-settings.png"),
    );
    renderSettings(
        repository,
        data,
        fixture,
        "settings-restoration.json",
        path.join(options.outDir, "after-restoration.png"),
    );
    panel(
        path.join(options.outDir, "before-settings.png"),
        "Before · Settings",
        path.join(temporary, "settings-before.png"),
        936,
    );
    panel(
        path.join(options.outDir, "after-restoration.png"),
        "After · pending restoration",
        path.join(temporary, "settings-after.png"),
        936,
    );
    run("magick", [
        path.join(temporary, "settings-before.png"),
        path.join(temporary, "settings-after.png"),
        "+append",
        path.join(options.outDir, "restoration.png"),
    ]);
    await writeFile(
        path.join(options.outDir, "capture.json"),
        JSON.stringify(
            {
                beforeCommit: baseline,
                afterSource: "working tree",
                fixture: "tools/readme-screenshots/fixture.json",
                date: fixture.today,
                meanAbsoluteError: metrics,
                settings:
                    "Fixture states: enabled versus disabled/pending; screenshots do not induce a disk failure.",
            },
            null,
            2,
        ) + "\n",
    );
    console.log(`Wrote before/after evidence to ${options.outDir}`);
} finally {
    await rm(temporary, { recursive: true, force: true });
}
