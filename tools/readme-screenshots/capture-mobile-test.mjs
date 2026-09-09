#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAdbDevices, validateEmulatorTarget } from "./lib/adb.mjs";
import { frameScreenshot } from "./lib/device-frames.mjs";
import { selectScenarios } from "./scenarios.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../..");
const testPackage = "no.silli.habittracker.test";

function usage(message) {
    if (message) process.stderr.write(`${message}\n\n`);
    process.stderr.write(
        "Usage: pnpm mobile:test:capture -- --serial <emulator-serial> --name <scenario> [--out-dir <path>]\n",
    );
    process.exit(2);
}

function parseArguments(arguments_) {
    const options = {
        outDir: path.join(repositoryRoot, "docs/assets/screenshots"),
    };
    for (let index = 0; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        if (argument === "--") continue;
        if (argument === "--serial") options.serial = arguments_[++index];
        else if (argument === "--name") options.name = arguments_[++index];
        else if (argument === "--out-dir")
            options.outDir = path.resolve(arguments_[++index] ?? "");
        else usage(`Unknown argument: ${argument}`);
    }
    if (!options.serial) usage("--serial is required");
    if (!options.name) usage("--name is required");
    return options;
}

function execute(executable, arguments_, encoding = "utf8") {
    return execFileSync(executable, arguments_, {
        encoding,
        maxBuffer: 20 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
    });
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
let scenario;
try {
    scenario = selectScenarios("android", options.name)[0][1];
} catch (error) {
    usage(error.message);
}

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

const packagePath = execute("adb", [
    "-s",
    options.serial,
    "shell",
    "pm",
    "path",
    testPackage,
]).trim();
if (!packagePath.startsWith("package:")) {
    throw new Error(
        `Test package ${testPackage} is not installed; run pnpm mobile:test:install`,
    );
}

const png = execute(
    "adb",
    ["-s", options.serial, "exec-out", "screencap", "-p"],
    null,
);
const dimensions = pngDimensions(png);
if (dimensions.height <= dimensions.width) {
    throw new Error(
        `Current screen is not portrait (${dimensions.width}x${dimensions.height})`,
    );
}

await mkdir(options.outDir, { recursive: true });
const output = path.join(options.outDir, scenario.output);
await writeFile(`${output}.new`, png);
await rename(`${output}.new`, output);
process.stdout.write(`wrote ${path.relative(repositoryRoot, output)}\n`);

const framedOutput = path.join(options.outDir, "framed", scenario.output);
await frameScreenshot({
    client: "android",
    inputPath: output,
    outputPath: framedOutput,
    frameSourcePath: path.join(
        repositoryRoot,
        "docs/assets/device-frames/device-family-source.png",
    ),
});
process.stdout.write(`wrote ${path.relative(repositoryRoot, framedOutput)}\n`);
