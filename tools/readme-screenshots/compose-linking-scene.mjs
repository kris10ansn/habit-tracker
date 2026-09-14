#!/usr/bin/env node

import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { composeLinkingScene } from "./lib/device-frames.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");

function usage(message) {
    if (message) process.stderr.write(`${message}\n\n`);
    process.stderr.write(
        "Usage: pnpm screenshots:linking [--input-dir <path>] [--output <path>]\n",
    );
    process.exit(2);
}

function parseArguments(arguments_) {
    const options = {
        inputDir: path.join(repositoryRoot, "docs/assets/screenshots"),
        output: path.join(
            repositoryRoot,
            "docs/assets/screenshots/framed/device-linking.png",
        ),
    };
    for (let index = 0; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        if (argument === "--") continue;
        if (argument === "--input-dir")
            options.inputDir = path.resolve(arguments_[++index] ?? "");
        else if (argument === "--output")
            options.output = path.resolve(arguments_[++index] ?? "");
        else usage(`Unknown argument: ${argument}`);
    }
    return options;
}

async function exists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

const options = parseArguments(process.argv.slice(2));
const candidates = {
    remarkablePairing: "remarkable-pairing.png",
    androidPairing: "android-pairing.png",
    androidDevices: "android-devices.png",
};
const inputs = {};

for (const [slotName, filename] of Object.entries(candidates)) {
    const inputPath = path.join(options.inputDir, filename);
    if (await exists(inputPath)) inputs[slotName] = inputPath;
}

await composeLinkingScene({
    frameSourcePath: path.join(
        repositoryRoot,
        "docs/assets/device-frames/device-family-source.png",
    ),
    inputs,
    outputPath: options.output,
});
process.stdout.write(
    `wrote ${path.relative(repositoryRoot, options.output)}\n`,
);
