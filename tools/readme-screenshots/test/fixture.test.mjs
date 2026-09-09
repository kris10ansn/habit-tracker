import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    loadFixture,
    remarkableProjection,
    validateFixture,
    writeRemarkableFixture,
} from "../lib/fixture.mjs";
import { scenarios, selectScenarios } from "../scenarios.mjs";
import { parseAdbDevices, validateEmulatorTarget } from "../lib/adb.mjs";

const fixturePath = new URL("../fixture.json", import.meta.url);
const require = createRequire(import.meta.url);
const {
    installFrozenDate,
} = require("../../../apps/mobile/src/testMode/freezeDate.js");
const {
    APP_PROVIDERS_IMPORT,
    withTestTarget,
} = require("../../../apps/mobile/src/testMode/metro.js");

test("canonical fixture is internally consistent", async () => {
    const fixture = await loadFixture(fixturePath);
    assert.equal(fixture.today, "2026-09-09");
    assert.equal(
        fixture.sessions.filter((session) => session.isCurrentDevice).length,
        1,
    );
});

test("reMarkable projection preserves order and converts outcomes", async () => {
    const fixture = await loadFixture(fixturePath);
    const projection = remarkableProjection(fixture);
    assert.deepEqual(
        projection.roster.habits.map((habit) => habit.id),
        fixture.habits.map((habit) => habit.id),
    );
    assert.deepEqual(
        new Set(projection.month.entries.map((entry) => entry.outcome)),
        new Set(["x", "o"]),
    );
    assert.equal(
        projection.roster.habits.find((habit) => habit.name === "Medication")
            .isPrivate,
        true,
    );
});

test("materializer writes paired and pairing-safe settings separately", async () => {
    const fixture = await loadFixture(fixturePath);
    const directory = await mkdtemp(
        path.join(os.tmpdir(), "habit-screenshots-test-"),
    );
    await writeRemarkableFixture(fixture, directory);
    const paired = JSON.parse(
        await readFile(path.join(directory, "settings.json"), "utf8"),
    );
    const pairing = JSON.parse(
        await readFile(path.join(directory, "settings-pairing.json"), "utf8"),
    );
    assert.notEqual(paired.token, "");
    assert.equal(pairing.token, "");
});

test("validator rejects duplicate entry identities", async () => {
    const fixture = await loadFixture(fixturePath);
    fixture.entries.push({ ...fixture.entries[0] });
    assert.throws(() => validateFixture(fixture), /duplicate entry/);
});

test("scenario selection is explicit", () => {
    assert.equal(Object.keys(scenarios.remarkable).length, 5);
    assert.equal(Object.keys(scenarios.android).length, 6);
    assert.deepEqual(selectScenarios("android", "devices")[0][0], "devices");
    assert.equal("route" in scenarios.android.devices, false);
    assert.throws(
        () => selectScenarios("android", "grid"),
        /Unknown android scenario/,
    );
});

test("adb parser distinguishes target states", () => {
    assert.deepEqual(
        parseAdbDevices(
            "List of devices attached\nemulator-5554\tdevice product:sdk model:Pixel_9a transport_id:1\nR5CT123\toffline\n",
        ),
        [
            { serial: "emulator-5554", state: "device" },
            { serial: "R5CT123", state: "offline" },
        ],
    );
});

test("emulator validation rejects physical, offline, and non-QEMU targets", () => {
    assert.doesNotThrow(() =>
        validateEmulatorTarget("emulator-5554", "device", "1"),
    );
    assert.throws(
        () => validateEmulatorTarget("R5CT123", "device", "1"),
        /local emulator serial/,
    );
    assert.throws(
        () => validateEmulatorTarget("emulator-5554", "offline", "1"),
        /not ready/,
    );
    assert.throws(
        () => validateEmulatorTarget("emulator-5554", "device", "0"),
        /does not report QEMU/,
    );
});

test("test app identity leaves ordinary Expo config unchanged", async () => {
    const appConfig = require("../../../apps/mobile/app.config.js");
    const appJson = JSON.parse(
        await readFile(
            new URL("../../../apps/mobile/app.json", import.meta.url),
            "utf8",
        ),
    ).expo;
    const previous = process.env.APP_TEST_BUILD;

    try {
        delete process.env.APP_TEST_BUILD;
        assert.deepEqual(appConfig({ config: appJson }), appJson);

        process.env.APP_TEST_BUILD = "1";
        const testConfig = appConfig({ config: appJson });
        assert.equal(testConfig.name, "Habit Tracker Test");
        assert.equal(testConfig.scheme, "habittracker-test");
        assert.equal(testConfig.android.package, "no.silli.habittracker.test");
        assert.equal(
            testConfig.ios.bundleIdentifier,
            "no.silli.habittracker.test",
        );
    } finally {
        if (previous === undefined) delete process.env.APP_TEST_BUILD;
        else process.env.APP_TEST_BUILD = previous;
    }
});

test("test target leaves the normal entry and resolver unchanged", async () => {
    const mobilePackage = JSON.parse(
        await readFile(
            new URL("../../../apps/mobile/package.json", import.meta.url),
            "utf8",
        ),
    );
    const previous = process.env.APP_TEST_BUILD;
    const config = { resolver: {} };

    try {
        delete process.env.APP_TEST_BUILD;
        assert.equal(mobilePackage.main, "expo-router/entry");
        assert.match(
            mobilePackage.scripts["test:build"],
            /ENTRY_FILE=src\/testMode\/entry\.js/,
        );
        assert.doesNotMatch(
            mobilePackage.scripts["test:build"],
            /EXPO_PUBLIC_APP_MODE/,
        );
        assert.equal(withTestTarget(config, "/mobile"), config);
        assert.equal(config.resolver.resolveRequest, undefined);
    } finally {
        if (previous === undefined) delete process.env.APP_TEST_BUILD;
        else process.env.APP_TEST_BUILD = previous;
    }
});

test("test target substitutes only the root provider import", () => {
    const previous = process.env.APP_TEST_BUILD;
    const delegated = { type: "sourceFile", filePath: "/default.ts" };
    const context = {
        resolveRequest() {
            return delegated;
        },
    };

    try {
        process.env.APP_TEST_BUILD = "1";
        const config = withTestTarget({ resolver: {} }, "/mobile");

        assert.deepEqual(
            config.resolver.resolveRequest(
                context,
                APP_PROVIDERS_IMPORT,
                "android",
            ),
            {
                type: "sourceFile",
                filePath: path.join(
                    "/mobile",
                    "src/testMode/TestAppProviders.tsx",
                ),
            },
        );
        assert.equal(
            config.resolver.resolveRequest(
                context,
                "../components/AppProviders",
                "android",
            ),
            delegated,
        );
    } finally {
        if (previous === undefined) delete process.env.APP_TEST_BUILD;
        else process.env.APP_TEST_BUILD = previous;
    }
});

test("test clock freezes implicit dates without changing explicit dates", () => {
    const NativeDate = globalThis.Date;
    const instant = Date.UTC(2026, 8, 9, 9, 41);
    const restore = installFrozenDate(instant);

    try {
        assert.equal(Date.now(), instant);
        assert.equal(new Date().getTime(), instant);
        assert.equal(new Date(2000, 0, 1).getFullYear(), 2000);
        assert.equal(Date.parse("2026-09-09T00:00:00Z"), 1788912000000);
        assert.match(Date(), /2026/);
        assert.equal(new Date() instanceof NativeDate, true);
    } finally {
        restore();
    }

    assert.equal(globalThis.Date, NativeDate);
});
