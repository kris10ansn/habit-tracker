import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import test from "node:test";

import {
    chooseEmulatorPort,
    editableCenter,
    expoGoRouteUrl,
    foregroundSummary,
    hasReverseRule,
    metroEnvironment,
    missingUiText,
    parseUiHierarchy,
    validatePng,
    validateScreenshotSet,
} from "../lib/expo-go.mjs";
import { scenarios } from "../scenarios.mjs";

test("Metro and Expo Go use the same IPv4 route", () => {
    const environment = metroEnvironment({ NODE_OPTIONS: "--trace-warnings" });
    assert.equal(environment.APP_TEST_MODE, "1");
    assert.equal(environment.CI, "1");
    assert.equal(environment.REACT_NATIVE_PACKAGER_HOSTNAME, "127.0.0.1");
    assert.match(environment.NODE_OPTIONS, /--trace-warnings/);
    assert.match(environment.NODE_OPTIONS, /--dns-result-order=ipv4first/);
    assert.equal(
        expoGoRouteUrl("exp://localhost:8081", "link-device"),
        "exp://127.0.0.1:8081/--/link-device",
    );
});

test("emulator ports do not collide with adb targets", () => {
    assert.equal(chooseEmulatorPort([]), 5554);
    assert.equal(
        chooseEmulatorPort([
            { serial: "emulator-5554" },
            { serial: "emulator-5556" },
            { serial: "physical-device" },
        ]),
        5558,
    );
});

test("reverse-rule ownership is scoped to the selected emulator", () => {
    const rules = [
        "emulator-5554 tcp:8081 tcp:8081",
        "emulator-5556 tcp:8082 tcp:8082",
    ].join("\n");
    assert.equal(hasReverseRule(rules, "emulator-5554", 8081), true);
    assert.equal(hasReverseRule(rules, "emulator-5556", 8081), false);
});

test("UI hierarchy readiness and input targeting use Android attributes", () => {
    const nodes = parseUiHierarchy(`<?xml version="1.0"?>
        <hierarchy>
            <node text="Link a device" class="android.widget.TextView" bounds="[10,20][200,60]" />
            <node text="PAIRING CODE" class="android.widget.TextView" bounds="[10,70][200,90]" />
            <node text="ABCDEF" class="android.widget.EditText" enabled="true" bounds="[20,100][220,180]" />
        </hierarchy>`);

    assert.deepEqual(
        missingUiText(nodes, scenarios.android.pairing.readyText),
        [],
    );
    assert.deepEqual(editableCenter(nodes), { x: 120, y: 140 });
    assert.deepEqual(missingUiText(nodes, ["reMarkable 1"]), ["reMarkable 1"]);
});

test("foreground diagnostics retain the focused Android window", () => {
    assert.equal(
        foregroundSummary(`
            Window #1 Window{launcher}:
              mCurrentFocus=Window{123 u0 host.exp.exponent/host.exp.exponent.experience.HomeActivity}
              mFocusedApp=ActivityRecord{456 u0 host.exp.exponent/.experience.HomeActivity t9}
        `),
        "mCurrentFocus=Window{123 u0 host.exp.exponent/host.exp.exponent.experience.HomeActivity} | mFocusedApp=ActivityRecord{456 u0 host.exp.exponent/.experience.HomeActivity t9}",
    );
    assert.equal(
        foregroundSummary(`
            mTopFocusedDisplayId=0
            imeInputTarget in display# 0 Window{789 u0 host.exp.exponent/host.exp.exponent.experience.ExperienceActivity}
        `),
        "imeInputTarget in display# 0 Window{789 u0 host.exp.exponent/host.exp.exponent.experience.ExperienceActivity}",
    );
});

const crcTable = Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1) >>> 0;
    }
    return crc;
});

function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
    const name = Buffer.from(type);
    const result = Buffer.alloc(data.length + 12);
    result.writeUInt32BE(data.length, 0);
    name.copy(result, 4);
    data.copy(result, 8);
    result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
    return result;
}

function testPng(width = 320, height = 640, accent = 40) {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8;
    header[9] = 2;

    const rows = Buffer.alloc((width * 3 + 1) * height);
    for (let row = 0; row < height; row += 1) {
        const offset = row * (width * 3 + 1);
        rows[offset] = 0;
        for (let column = 0; column < width; column += 1) {
            const pixel = offset + 1 + column * 3;
            rows[pixel] = (row + accent) % 256;
            rows[pixel + 1] = (column + accent) % 256;
            rows[pixel + 2] = accent;
        }
    }

    return Buffer.concat([
        Buffer.from("89504e470d0a1a0a", "hex"),
        pngChunk("IHDR", header),
        pngChunk("IDAT", deflateSync(rows)),
        pngChunk("IEND", Buffer.alloc(0)),
    ]);
}

test("PNG validation decodes portrait pixels before accepting a set", () => {
    const first = testPng();
    const second = testPng(320, 640, 80);
    assert.deepEqual(validatePng(first), { width: 320, height: 640 });
    assert.deepEqual(
        validateScreenshotSet([
            { name: "today", bytes: first },
            { name: "month", bytes: second },
        ]),
        { width: 320, height: 640 },
    );

    const corrupt = Buffer.from(first);
    corrupt[corrupt.length - 5] ^= 1;
    assert.throws(() => validatePng(corrupt), /checksum/);
    assert.throws(
        () =>
            validateScreenshotSet([
                { name: "today", bytes: first },
                { name: "month", bytes: first },
            ]),
        /duplicates another screenshot/,
    );
});
