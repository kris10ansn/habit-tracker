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
import {
    chooseAvd,
    chooseEmulatorPort,
    discoverExpoGoUrl,
    expoGoRouteUrl,
} from "../lib/expo-go.mjs";
import { scenarios, selectScenarios } from "../scenarios.mjs";
import { parseAdbDevices, validateEmulatorTarget } from "../lib/adb.mjs";
import { parseArguments } from "../capture-mobile.mjs";

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

test("Expo Go route URLs preserve the project URL", () => {
    assert.equal(
        expoGoRouteUrl("exp://127.0.0.1:8090", "month"),
        "exp://127.0.0.1:8090/--/month",
    );
    assert.equal(
        expoGoRouteUrl("exps://example.test/project/", "/devices/"),
        "exps://example.test/project/--/devices",
    );
    assert.equal(
        expoGoRouteUrl("exp://127.0.0.1:8090", ""),
        "exp://127.0.0.1:8090",
    );
    assert.throws(
        () => expoGoRouteUrl("https://example.test", "month"),
        /Expected an Expo Go URL/,
    );
});

test("Expo Go discovery requests the Android Expo runtime", async () => {
    let requestedUrl;
    const result = await discoverExpoGoUrl(
        "http://127.0.0.1:8090",
        async (url) => {
            requestedUrl = url;
            return {
                ok: true,
                async json() {
                    return {
                        runtime: "expo",
                        url: "exp://127.0.0.1:8090",
                    };
                },
            };
        },
    );

    assert.equal(result, "exp://127.0.0.1:8090");
    assert.equal(requestedUrl.pathname, "/_expo/open");
    assert.equal(requestedUrl.searchParams.get("platform"), "android");
    assert.equal(requestedUrl.searchParams.get("runtime"), "expo");
});

test("AVD and emulator-port selection stay explicit", () => {
    assert.equal(chooseAvd(["Pixel_9a"], undefined), "Pixel_9a");
    assert.equal(chooseAvd(["Pixel_8", "Pixel_9a"], "Pixel_9a"), "Pixel_9a");
    assert.throws(
        () => chooseAvd(["Pixel_8", "Pixel_9a"], undefined),
        /choose one with --avd/,
    );
    assert.throws(() => chooseAvd([], undefined), /No Android AVDs/);
    assert.equal(
        chooseEmulatorPort([
            { serial: "emulator-5554", state: "device" },
            { serial: "R5CT123", state: "device" },
        ]),
        5556,
    );
});

test("mobile capture arguments never accept a physical device", () => {
    assert.deepEqual(parseArguments(["--avd", "Pixel_9a"]), {
        avd: "Pixel_9a",
        metroPort: 8090,
        outputDirectory: path.resolve("docs/assets/screenshots"),
        keepEmulator: false,
    });
    assert.throws(
        () => parseArguments(["--serial", "R5CT123"]),
        /local Android emulator/,
    );
    assert.throws(() => parseArguments(["--avd"]), /requires a value/);
    assert.throws(
        () => parseArguments(["--out-dir", "--keep-emulator"]),
        /requires a value/,
    );
    assert.throws(
        () =>
            parseArguments(["--avd", "Pixel_9a", "--serial", "emulator-5554"]),
        /mutually exclusive/,
    );
});

test("Maestro flow is parameterized and captures every Android scenario", async () => {
    const flow = await readFile(
        new URL("../maestro/capture.yaml", import.meta.url),
        "utf8",
    );
    assert.match(flow, /appId: \$\{APP_ID\}/);
    assert.match(flow, /openLink: \$\{EXPO_ROOT_URL\}/);
    assert.match(flow, /inputText: \$\{PAIRING_CODE\}/);
    for (const scenario of Object.values(scenarios.android)) {
        assert.match(flow, new RegExp(path.parse(scenario.output).name));
    }
});

test("test app identity leaves ordinary Expo config unchanged", async () => {
    const appConfig = require("../../../apps/mobile/app.config.js");
    const appJson = JSON.parse(
        await readFile(
            new URL("../../../apps/mobile/app.json", import.meta.url),
            "utf8",
        ),
    ).expo;
    const previous = process.env.APP_TEST_MODE;

    try {
        delete process.env.APP_TEST_MODE;
        assert.deepEqual(appConfig({ config: appJson }), appJson);

        process.env.APP_TEST_MODE = "1";
        const testConfig = appConfig({ config: appJson });
        assert.equal(testConfig.name, "Habit Tracker Test");
        assert.equal(testConfig.slug, "habit-tracker-test");
        assert.equal(testConfig.userInterfaceStyle, "light");
        assert.equal(testConfig.scheme, appJson.scheme);
        assert.deepEqual(testConfig.android, appJson.android);
        assert.deepEqual(testConfig.ios, appJson.ios);
        assert.equal("eas" in testConfig.extra, false);
        assert.deepEqual(testConfig.extra.router, {});
    } finally {
        if (previous === undefined) delete process.env.APP_TEST_MODE;
        else process.env.APP_TEST_MODE = previous;
    }
});

test("test mode leaves the normal entry and resolver unchanged", async () => {
    const mobilePackage = JSON.parse(
        await readFile(
            new URL("../../../apps/mobile/package.json", import.meta.url),
            "utf8",
        ),
    );
    const testProviders = await readFile(
        new URL(
            "../../../apps/mobile/src/testMode/TestAppProviders.tsx",
            import.meta.url,
        ),
        "utf8",
    );
    const previous = process.env.APP_TEST_MODE;
    const config = { resolver: {} };

    try {
        delete process.env.APP_TEST_MODE;
        assert.equal(mobilePackage.main, "expo-router/entry");
        assert.equal(
            mobilePackage.scripts["test:go"],
            "APP_TEST_MODE=1 expo start --go",
        );
        assert.equal("test:build" in mobilePackage.scripts, false);
        assert.match(testProviders, /^import "\.\/installGlobals";/);
        assert.equal(withTestTarget(config, "/mobile"), config);
        assert.equal(config.resolver.resolveRequest, undefined);
    } finally {
        if (previous === undefined) delete process.env.APP_TEST_MODE;
        else process.env.APP_TEST_MODE = previous;
    }
});

test("test target substitutes only the root provider import", () => {
    const previous = process.env.APP_TEST_MODE;
    const delegated = { type: "sourceFile", filePath: "/default.ts" };
    const context = {
        resolveRequest() {
            return delegated;
        },
    };

    try {
        process.env.APP_TEST_MODE = "1";
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
        if (previous === undefined) delete process.env.APP_TEST_MODE;
        else process.env.APP_TEST_MODE = previous;
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
