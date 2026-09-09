#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rename,
    rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadFixture, writeRemarkableFixture } from "./lib/fixture.mjs";
import { frameScreenshot } from "./lib/device-frames.mjs";
import { selectScenarios } from "./scenarios.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");

function usage(message) {
    if (message) process.stderr.write(`${message}\n\n`);
    process.stderr.write(
        "Usage: pnpm screenshots:remarkable [--scenario <name>] [--fixture <path>] [--out-dir <path>] [--keep-temp]\n",
    );
    process.exit(2);
}

function parseArguments(arguments_) {
    const options = {
        fixture: path.join(scriptDirectory, "fixture.json"),
        outDir: path.join(repositoryRoot, "docs/assets/screenshots"),
        keepTemp: false,
    };
    for (let index = 0; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        if (argument === "--") continue;
        if (argument === "--keep-temp") options.keepTemp = true;
        else if (argument === "--scenario")
            options.scenario = arguments_[++index];
        else if (argument === "--fixture")
            options.fixture = path.resolve(arguments_[++index] ?? "");
        else if (argument === "--out-dir")
            options.outDir = path.resolve(arguments_[++index] ?? "");
        else usage(`Unknown argument: ${argument}`);
    }
    if (options.scenario === undefined && arguments_.includes("--scenario"))
        usage("--scenario needs a value");
    return options;
}

function run(executable, arguments_, cwd = repositoryRoot) {
    execFileSync(executable, arguments_, {
        cwd,
        stdio: "inherit",
        env: process.env,
    });
}

async function requirePng(filePath, width, height) {
    const bytes = await readFile(filePath);
    if (
        bytes.length < 24 ||
        bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    ) {
        throw new Error(`${filePath} is not a PNG`);
    }
    if (bytes.readUInt32BE(16) !== width || bytes.readUInt32BE(20) !== height) {
        throw new Error(`${filePath} is not ${width}x${height}`);
    }
}

const options = parseArguments(process.argv.slice(2));
let selected;
try {
    selected = selectScenarios("remarkable", options.scenario);
} catch (error) {
    usage(error.message);
}

const fixture = await loadFixture(options.fixture);
const fixtureDirectory = await mkdtemp(
    path.join(os.tmpdir(), "habit-readme-fixture-"),
);
await mkdir(path.dirname(options.outDir), { recursive: true });
const stagingDirectory = await mkdtemp(
    path.join(path.dirname(options.outDir), ".habit-readme-capture-"),
);

try {
    await writeRemarkableFixture(fixture, fixtureDirectory);
    run("make", [
        "-C",
        "apps/remarkable",
        "readme-screenshot-host",
        "suspend-writer-host",
    ]);

    for (const [name, scenario] of selected) {
        const outputPath = path.join(stagingDirectory, scenario.output);
        if (scenario.renderer === "suspend") {
            const deviceOutputPath = path.join(
                stagingDirectory,
                "remarkable-suspend-device.png",
            );
            run(
                path.join(
                    repositoryRoot,
                    "apps/remarkable/tools/suspend-writer/build/suspend-writer",
                ),
                [
                    "--roster",
                    path.join(fixtureDirectory, "roster.json"),
                    "--month",
                    path.join(
                        fixtureDirectory,
                        `${fixture.today.slice(0, 7)}.json`,
                    ),
                    "--today",
                    fixture.today,
                    "--out",
                    deviceOutputPath,
                ],
            );
            // The actual suspend file is portrait pixels containing a 90-degree scene, matching
            // the framebuffer. Rotate only the README copy into a readable landscape PNG.
            run("magick", [deviceOutputPath, "-rotate", "-90", outputPath]);
        } else {
            const settingsName =
                name === "pairing" ? "settings-pairing.json" : "settings.json";
            run(
                path.join(
                    repositoryRoot,
                    "apps/remarkable/tools/readme-screenshots/build/readme-screenshot",
                ),
                [
                    "--scenario",
                    name,
                    "--data-dir",
                    fixtureDirectory,
                    "--settings",
                    path.join(fixtureDirectory, settingsName),
                    "--sync",
                    path.join(fixtureDirectory, "sync.json"),
                    "--today",
                    fixture.today,
                    "--pairing-code",
                    fixture.pairing.code,
                    "--out",
                    outputPath,
                ],
            );
        }
        await requirePng(outputPath, 1872, 1404);
    }

    await mkdir(options.outDir, { recursive: true });
    for (const [, scenario] of selected) {
        const stagedPath = path.join(stagingDirectory, scenario.output);
        const finalPath = path.join(options.outDir, scenario.output);
        await copyFile(stagedPath, `${finalPath}.new`);
        await rename(`${finalPath}.new`, finalPath);
        process.stdout.write(
            `wrote ${path.relative(repositoryRoot, finalPath)}\n`,
        );
        const framedPath = path.join(options.outDir, "framed", scenario.output);
        await frameScreenshot({
            client: "remarkable",
            inputPath: finalPath,
            outputPath: framedPath,
            frameSourcePath: path.join(
                repositoryRoot,
                "docs/assets/device-frames/device-family-source.png",
            ),
        });
        process.stdout.write(
            `wrote ${path.relative(repositoryRoot, framedPath)}\n`,
        );
    }
} finally {
    if (options.keepTemp) {
        process.stdout.write(
            `kept fixture: ${fixtureDirectory}\nkept staging: ${stagingDirectory}\n`,
        );
    } else {
        await Promise.all([
            rm(fixtureDirectory, { recursive: true, force: true }),
            rm(stagingDirectory, { recursive: true, force: true }),
        ]);
    }
}
