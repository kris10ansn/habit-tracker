import assert from "node:assert/strict";
import test from "node:test";
import {
    captureNative,
    missingContent,
    parseNativeUi,
} from "../lib/native-capture.mjs";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

test("reads Android text, accessibility labels, entities, and tap bounds", () => {
    const nodes = parseNativeUi(`<?xml version='1.0'?><hierarchy rotation="0">
        <node text="Read &amp; write" package="host.exp.exponent" bounds="[10,20][110,60]" />
        <node text="" content-desc="6 days &#x1F525;" package="host.exp.exponent" bounds="[0,0][0,0]" />
    </hierarchy>UI hierarchy dumped to: /dev/tty`);
    assert.equal(nodes[0].text, "Read & write");
    assert.deepEqual(nodes[0].center, [60, 40]);
    assert.equal(nodes[1].text, "6 days 🔥");
    assert.equal(nodes[1].center, undefined);
    assert.deepEqual(missingContent(nodes, ["Read & write", "6 days"]), []);
});

test("does not accept system UI text as app readiness", () => {
    const nodes = parseNativeUi(
        '<hierarchy><node text="Read 20 min" package="com.android.launcher3" /></hierarchy>',
    );
    assert.deepEqual(missingContent(nodes, ["Read 20 min"]), ["Read 20 min"]);
});

test("rejects interrupted or failed hierarchy dumps", () => {
    for (const text of [
        "",
        "ERROR: could not get idle state",
        "<hierarchy><node />",
    ]) {
        assert.throws(() => parseNativeUi(text), /complete UI hierarchy/);
    }
});

test("recovers an offline screenshot command after checking actual app content", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "native-capture-"));
    const calls = [];
    let captures = 0;
    let retries = 0;
    const xml =
        '<hierarchy><node package="host.exp.exponent" text="logged today Read 20 min 4 of 6 habits logged 6 days" /></hierarchy>';
    try {
        const files = await captureNative({
            output: directory,
            scenario: "today",
            url: "exp://10.0.2.2:8082",
            announce: () => {},
            onCommandRetry: () => retries++,
            adb: async (args) => {
                calls.push(args.join(" "));
                if (args.includes("uiautomator")) return xml;
                if (args.includes("screencap") && ++captures === 1)
                    throw new Error("adb exited 255: error: device offline");
                return "";
            },
        });
        assert.equal(files.length, 1);
        assert.equal(retries, 1);
        assert.deepEqual(calls, [
            "exec-out uiautomator dump /dev/tty",
            "exec-out uiautomator dump /dev/tty",
            "exec-out screencap -p",
            "wait-for-device",
            "exec-out screencap -p",
        ]);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
