#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAdbDevices, validateEmulatorTarget } from "./lib/adb.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../..");
const defaultApk = path.join(
    repositoryRoot,
    "apps/mobile/android/app/build/outputs/apk/release/app-release.apk",
);

function usage(message) {
    if (message) process.stderr.write(`${message}\n\n`);
    process.stderr.write(
        "Usage: pnpm mobile:test:install -- --serial <emulator-serial> [--apk <path>]\n",
    );
    process.exit(2);
}

function parseArguments(arguments_) {
    const options = { apk: defaultApk };
    for (let index = 0; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        if (argument === "--") continue;
        if (argument === "--serial") options.serial = arguments_[++index];
        else if (argument === "--apk")
            options.apk = path.resolve(arguments_[++index] ?? "");
        else usage(`Unknown argument: ${argument}`);
    }
    if (!options.serial) usage("--serial is required");
    return options;
}

function execute(executable, arguments_) {
    return execFileSync(executable, arguments_, {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
    });
}

const options = parseArguments(process.argv.slice(2));
await access(options.apk).catch(() => {
    throw new Error(
        `Test APK not found at ${options.apk}; run pnpm mobile:test:build`,
    );
});

const devices = parseAdbDevices(execute("adb", ["devices", "-l"]));
const target = devices.find((device) => device.serial === options.serial);
if (!target) throw new Error(`${options.serial} is not listed by adb`);
if (target.state !== "device") {
    throw new Error(`${options.serial} is not ready (state: ${target.state})`);
}

const qemu = execute("adb", [
    "-s",
    options.serial,
    "shell",
    "getprop",
    "ro.kernel.qemu",
]);
validateEmulatorTarget(options.serial, target.state, qemu);

process.stdout.write(`installing test app on ${options.serial}\n`);
process.stdout.write(
    execute("adb", ["-s", options.serial, "install", "-r", options.apk]),
);
