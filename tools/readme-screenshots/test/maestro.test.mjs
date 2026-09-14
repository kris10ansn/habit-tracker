import assert from "node:assert/strict";
import test from "node:test";
import { isMaestroConnectionFailure } from "../lib/maestro.mjs";

test("recognizes Maestro transport loss and driver installation failure", () => {
    for (const diagnostic of [
        "maestro.android.DeviceServerDiedException: UNAVAILABLE",
        "Command failed (host:transport:emulator-5554): device offline",
        "Android driver unreachable",
        "at maestro.drivers.AndroidDriver.installMaestroServerApp(AndroidDriver.kt:1222)",
    ])
        assert.equal(isMaestroConnectionFailure(diagnostic), true);
});

test("does not retry application, assertion, or generic timeout failures", () => {
    for (const diagnostic of [
        "Assertion is false: Read 20 min is visible",
        "TypeError: Cannot read properties of undefined",
        "Timed out waiting for UI",
        "",
    ])
        assert.equal(isMaestroConnectionFailure(diagnostic), false);
});
