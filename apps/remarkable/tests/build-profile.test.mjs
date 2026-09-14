import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";

const appDirectory = path.resolve(import.meta.dirname, "..");

function withProfile(profile, run) {
    const directory = mkdtempSync(
        path.join(os.tmpdir(), "remarkable-profile-"),
    );
    try {
        cpSync(path.join(appDirectory, "src"), path.join(directory, "src"), {
            recursive: true,
        });
        execFileSync(
            process.execPath,
            ["scripts/stage-profile.mjs", profile, directory],
            { cwd: appDirectory },
        );
        const context = vm.createContext({});
        vm.runInContext(
            readFileSync(
                path.join(directory, "src/js/BuildProfile.js"),
                "utf8",
            ),
            context,
        );
        const configuration = vm.runInContext(
            "({ isTest, appId, appDirectory, dataDirectory, settingsPath, suspendPath, suspendBackupPath, signaturePath, canWrite })",
            context,
        );
        const manifest = JSON.parse(
            readFileSync(path.join(directory, "manifest.json"), "utf8"),
        );
        run(configuration, manifest);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
}

test("test install and every persisted file belong to the test app", () => {
    withProfile("test", (profile, manifest) => {
        assert.equal(manifest.id, "habit-tracker-test");
        assert.equal(manifest.name, "Habit Tracker TEST");
        assert.equal(profile.appId, manifest.id);
        for (const target of [
            profile.settingsPath,
            profile.suspendPath,
            profile.suspendBackupPath,
            profile.signaturePath,
            `${profile.dataDirectory}/roster.json`,
            `${profile.dataDirectory}/2026-09.json`,
            `${profile.dataDirectory}/sync.json`,
        ]) {
            assert.equal(profile.canWrite(target), true, target);
            assert.ok(
                target.startsWith(
                    "/home/root/xovi/exthome/appload/habit-tracker-test/",
                ),
            );
        }
    });
});

test("test writes reject production, system, traversal, and URL-escaped paths", () => {
    withProfile("test", (profile) => {
        const blocked = [
            "/home/root/xovi/exthome/appload/habit-tracker/data/roster.json",
            "/home/root/xovi/exthome/appload/habit-tracker/settings.json",
            "/usr/share/remarkable/suspended.png",
            "/usr/share/remarkable/suspended.png.bak",
            `${profile.appDirectory}-other/settings.json`,
            `${profile.appDirectory}/../habit-tracker/settings.json`,
            `${profile.appDirectory}/data/../../habit-tracker/settings.json`,
            `${profile.appDirectory}/%2e%2e/habit-tracker/settings.json`,
            `${profile.appDirectory}/data/./roster.json`,
            `${profile.appDirectory}//roster.json`,
            `file://${profile.settingsPath}`,
            "",
            null,
        ];
        for (const target of blocked)
            assert.equal(profile.canWrite(target), false, String(target));

        let requests = 0;
        const context = vm.createContext({
            BuildProfile: profile,
            XMLHttpRequest: function () {
                requests += 1;
            },
            console: { warn() {} },
        });
        const storage = readFileSync(
            path.join(appDirectory, "src/js/Storage.js"),
            "utf8",
        );
        vm.runInContext(storage.replace(/^\.import .*\n/gm, ""), context);
        const errors = [];
        context.writeFile(blocked[0], "overwrite", (error) =>
            errors.push(error),
        );
        context.writeJson(blocked[1], { token: "test" }, (error) =>
            errors.push(error),
        );
        context.writeBinary(blocked[2], new ArrayBuffer(2), (error) =>
            errors.push(error),
        );
        assert.equal(requests, 0);
        assert.equal(errors.length, 3);
        for (const error of errors) assert.match(error, /refusing write/);
    });
});

test("stable paths and launcher identity remain compatible", () => {
    withProfile("stable", (profile, manifest) => {
        assert.equal(profile.isTest, false);
        assert.equal(manifest.id, "habit-tracker");
        assert.equal(
            profile.settingsPath,
            "/home/root/xovi/exthome/appload/habit-tracker/settings.json",
        );
        assert.equal(
            profile.suspendPath,
            "/usr/share/remarkable/suspended.png",
        );
        assert.equal(profile.canWrite("/tmp/host-test.json"), true);
    });
});
