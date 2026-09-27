import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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
            "({ isTest, appId, appDirectory, dataDirectory, settingsPath, canWrite })",
            context,
        );
        const manifest = JSON.parse(
            readFileSync(path.join(directory, "manifest.json"), "utf8"),
        );
        const resources = readFileSync(
            path.join(directory, "application.qrc"),
            "utf8",
        );
        assert.deepEqual(JSON.parse(readFileSync(path.join(directory, "writer-profile.json"), "utf8")), { testProfile: profile === "test" });
        run(configuration, manifest, resources, directory);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
}

test("test install and every persisted file belong to the test app", () => {
    withProfile("test", (profile, manifest, resources) => {
        assert.match(resources, /src\/testing\/DeveloperTools.qml/);
        assert.equal(manifest.id, "habit-tracker-test");
        assert.equal(manifest.loadsBackend, true);
        assert.doesNotMatch(resources, /src\/worker\//);
        assert.doesNotMatch(resources, /SuspendCanvas|BootCanvas|PowerImageJobs|SuspendDraw/);
        assert.equal(manifest.name, "Habit Tracker TEST");
        assert.equal(profile.appId, manifest.id);
        for (const target of [
            profile.settingsPath,
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
            "/usr/share/remarkable/poweroff.png",
            "/usr/share/remarkable/batteryempty.png",
            "/usr/share/remarkable/starting.png",
            "/usr/share/remarkable/rebooting.png",
            "/usr/share/remarkable/overheating.png",
            "/usr/share/remarkable/restart-crashed.png",
            "/usr/share/remarkable/splash/splash.bmp",
            "/var/lib/uboot/splash.bmp",
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
        assert.equal(requests, 0);
        assert.equal(errors.length, 2);
        for (const error of errors) assert.match(error, /refusing write/);
    });
});

test("stable paths and launcher identity remain compatible", () => {
    withProfile("stable", (profile, manifest, resources) => {
        assert.doesNotMatch(resources, /src\/testing\//);
        assert.equal(profile.isTest, false);
        assert.equal(manifest.id, "habit-tracker");
        assert.equal(manifest.loadsBackend, true);
        assert.doesNotMatch(resources, /src\/worker\//);
        assert.match(resources, /src\/components\/ImageBackend.qml/);
        assert.equal(
            profile.settingsPath,
            "/home/root/xovi/exthome/appload/habit-tracker/settings.json",
        );
        assert.equal(profile.canWrite("/tmp/host-test.json"), true);
    });
});
