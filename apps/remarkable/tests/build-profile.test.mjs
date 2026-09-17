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
        const resources = readFileSync(
            path.join(directory, "application.qrc"),
            "utf8",
        );
        run(configuration, manifest, resources);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
}

test("test install and every persisted file belong to the test app", () => {
    withProfile("test", (profile, manifest, resources) => {
        assert.match(resources, /src\/testing\/DeveloperTools.qml/);
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
    withProfile("stable", (profile, manifest, resources) => {
        assert.doesNotMatch(resources, /src\/testing\//);
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

test("binary writes reject an unchanged same-size file and verify the actual bytes", () => {
    withProfile("test", (profile) => {
        const destination = "/usr/share/remarkable/suspended.png";
        const requested = new Uint8Array([1, 2, 3]).buffer;
        let stored = new Uint8Array([3, 2, 1]).buffer;
        let acceptWrite = false;
        const writes = [];
        const context = vm.createContext({
            BuildProfile: profile,
            console: { warn() {} },
            XMLHttpRequest: class {
                DONE = 4;
                status = 0;
                open(method, url) {
                    this.method = method;
                    this.url = url;
                }
                send(buffer) {
                    assert.equal(this.url, `file://${destination}`);
                    if (this.method === "GET") {
                        this.response = stored;
                        return;
                    }
                    writes.push(this.url);
                    if (acceptWrite) stored = buffer;
                    this.readyState = this.DONE;
                    this.onreadystatechange();
                }
            },
        });
        const storage = readFileSync(
            path.join(appDirectory, "src/js/BinaryFiles.js"),
            "utf8",
        );
        vm.runInContext(storage, context);
        const errors = [];
        context.write(destination, requested, (error) => errors.push(error));
        assert.match(errors[0], /binary write failed/);
        acceptWrite = true;
        context.write(destination, requested, (error) => errors.push(error));
        assert.equal(errors[1], null);
        assert.equal(writes.length, 2);
        assert.equal(profile.canWrite(destination), false);
    });
});
