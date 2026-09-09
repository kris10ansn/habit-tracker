#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
    copyFile,
    mkdir,
    mkdtemp,
    rename,
    rm,
    writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAdbDevices, validateEmulatorTarget } from "./lib/adb.mjs";
import { selectScenarios } from "./scenarios.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../..");
const screenshotPackage = "no.silli.habittracker.readme";
const screenshotScheme = "habittracker-readme";

function usage(message) {
    if (message) process.stderr.write(`${message}\n\n`);
    process.stderr.write(
        "Usage: pnpm screenshots:android -- --serial <emulator-serial> [--scenario <name>] [--out-dir <path>] [--keep-temp]\n",
    );
    process.exit(2);
}

function parseArguments(arguments_) {
    const options = {
        outDir: path.join(repositoryRoot, "docs/assets/screenshots"),
        keepTemp: false,
    };
    for (let index = 0; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        if (argument === "--") continue;
        if (argument === "--keep-temp") options.keepTemp = true;
        else if (argument === "--serial") options.serial = arguments_[++index];
        else if (argument === "--scenario")
            options.scenario = arguments_[++index];
        else if (argument === "--out-dir")
            options.outDir = path.resolve(arguments_[++index] ?? "");
        else usage(`Unknown argument: ${argument}`);
    }
    if (!options.serial) usage("--serial is required");
    return options;
}

function execute(executable, arguments_, encoding = "utf8") {
    return execFileSync(executable, arguments_, {
        encoding,
        maxBuffer: 20 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
    });
}

function adb(serial, ...arguments_) {
    return execute("adb", ["-s", serial, ...arguments_]);
}

function adbBinary(serial, ...arguments_) {
    return execute("adb", ["-s", serial, ...arguments_], null);
}

function setting(serial, action, namespace, key, value) {
    const arguments_ = ["shell", "settings", action, namespace, key];
    if (value !== undefined) arguments_.push(value);
    return adb(serial, ...arguments_).trim();
}

function deepLink(route) {
    return route === "/"
        ? `${screenshotScheme}://`
        : `${screenshotScheme}://${route.slice(1)}`;
}

function waitForText(serial, expected, timeoutMs = 25_000) {
    const deadline = Date.now() + timeoutMs;
    let lastHierarchy = "";
    while (Date.now() < deadline) {
        try {
            adb(
                serial,
                "shell",
                "uiautomator",
                "dump",
                "/sdcard/readme-screenshot.xml",
            );
            lastHierarchy = adb(
                serial,
                "exec-out",
                "cat",
                "/sdcard/readme-screenshot.xml",
            );
            if (lastHierarchy.includes(expected)) return;
        } catch {
            // A navigation transition can briefly make the hierarchy unavailable; retry it.
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
    throw new Error(
        `Timed out waiting for visible text ${JSON.stringify(expected)}\n${lastHierarchy.slice(0, 2000)}`,
    );
}

function pngDimensions(bytes) {
    if (
        bytes.length < 24 ||
        bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    ) {
        throw new Error("adb screencap did not return a PNG");
    }
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const options = parseArguments(process.argv.slice(2));
let selected;
try {
    selected = selectScenarios("android", options.scenario);
} catch (error) {
    usage(error.message);
}

const devices = parseAdbDevices(execute("adb", ["devices", "-l"]));
const target = devices.find((device) => device.serial === options.serial);
if (!target) throw new Error(`${options.serial} is not listed by adb`);
if (target.state !== "device") {
    throw new Error(`${options.serial} is not ready (state: ${target.state})`);
}
const qemu = adb(options.serial, "shell", "getprop", "ro.kernel.qemu");
validateEmulatorTarget(options.serial, target.state, qemu);

const packagePath = adb(
    options.serial,
    "shell",
    "pm",
    "path",
    screenshotPackage,
).trim();
if (!packagePath.startsWith("package:")) {
    throw new Error(
        `Screenshot-mode package ${screenshotPackage} is not installed; run pnpm screenshots:android:build --device Pixel_9a`,
    );
}

const model = adb(
    options.serial,
    "shell",
    "getprop",
    "ro.product.model",
).trim();
const apiLevel = adb(
    options.serial,
    "shell",
    "getprop",
    "ro.build.version.sdk",
).trim();
const locale = adb(
    options.serial,
    "shell",
    "getprop",
    "persist.sys.locale",
).trim();
process.stdout.write(
    `target ${options.serial}: ${model}, API ${apiLevel}, ${locale || "default locale"}\npackage ${screenshotPackage}\n`,
);

const settingsToNormalize = [
    ["global", "window_animation_scale", "0"],
    ["global", "transition_animation_scale", "0"],
    ["global", "animator_duration_scale", "0"],
    ["system", "accelerometer_rotation", "0"],
    ["system", "user_rotation", "0"],
    ["system", "font_scale", "1.0"],
];
const previousSettings = settingsToNormalize.map(([namespace, key]) => [
    namespace,
    key,
    setting(options.serial, "get", namespace, key),
]);

await mkdir(path.dirname(options.outDir), { recursive: true });
const stagingDirectory = await mkdtemp(
    path.join(path.dirname(options.outDir), ".habit-android-capture-"),
);

try {
    for (const [namespace, key, value] of settingsToNormalize) {
        setting(options.serial, "put", namespace, key, value);
    }
    adb(options.serial, "shell", "input", "keyevent", "KEYCODE_WAKEUP");
    adb(options.serial, "shell", "wm", "dismiss-keyguard");

    for (const [name, scenario] of selected) {
        process.stdout.write(`capturing ${name} -> ${scenario.output}\n`);
        adb(options.serial, "shell", "am", "force-stop", screenshotPackage);
        adb(
            options.serial,
            "shell",
            "am",
            "start",
            "-W",
            "-a",
            "android.intent.action.VIEW",
            "-d",
            deepLink(scenario.route),
            screenshotPackage,
        );
        waitForText(options.serial, scenario.readyText);

        const png = adbBinary(options.serial, "exec-out", "screencap", "-p");
        const dimensions = pngDimensions(png);
        if (dimensions.height <= dimensions.width) {
            throw new Error(
                `${name} capture is not portrait (${dimensions.width}x${dimensions.height})`,
            );
        }
        await writeFile(path.join(stagingDirectory, scenario.output), png);
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
    }
} finally {
    for (const [namespace, key, value] of previousSettings) {
        if (value && value !== "null")
            setting(options.serial, "put", namespace, key, value);
        else setting(options.serial, "delete", namespace, key);
    }
    if (options.keepTemp)
        process.stdout.write(`kept staging: ${stagingDirectory}\n`);
    else await rm(stagingDirectory, { recursive: true, force: true });
}
