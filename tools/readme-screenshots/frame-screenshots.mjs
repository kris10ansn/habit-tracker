#!/usr/bin/env node

import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { frameScreenshot } from "./lib/device-frames.mjs";
import { scenarios, selectScenarios } from "./scenarios.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");

function usage(message) {
    if (message) process.stderr.write(`${message}\n\n`);
    process.stderr.write(
        "Usage: pnpm screenshots:frame [--client <remarkable|android>] [--scenario <name>] [--input-dir <path>] [--out-dir <path>]\n" +
            "       pnpm screenshots:frame -- --client <remarkable|android> --input <png> --output <png>\n",
    );
    process.exit(2);
}

function parseArguments(arguments_) {
    const options = {
        inputDir: path.join(repositoryRoot, "docs/assets/screenshots"),
        outDir: path.join(repositoryRoot, "docs/assets/screenshots/framed"),
    };
    for (let index = 0; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        if (argument === "--") continue;
        if (argument === "--client") options.client = arguments_[++index];
        else if (argument === "--scenario")
            options.scenario = arguments_[++index];
        else if (argument === "--input")
            options.input = path.resolve(arguments_[++index] ?? "");
        else if (argument === "--output")
            options.output = path.resolve(arguments_[++index] ?? "");
        else if (argument === "--input-dir")
            options.inputDir = path.resolve(arguments_[++index] ?? "");
        else if (argument === "--out-dir")
            options.outDir = path.resolve(arguments_[++index] ?? "");
        else usage(`Unknown argument: ${argument}`);
    }
    if (options.client && !scenarios[options.client]) {
        usage(`Unknown client: ${options.client}`);
    }
    if (options.scenario && !options.client) {
        usage("--scenario requires --client");
    }
    if (options.input || options.output) {
        if (!options.input || !options.output || !options.client) {
            usage("--input and --output require each other and --client");
        }
        if (options.scenario) usage("--scenario cannot be used with --input");
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
const frameSourcePath = path.join(
    repositoryRoot,
    "docs/assets/device-frames/device-family-source.png",
);

if (options.input) {
    await frameScreenshot({
        client: options.client,
        inputPath: options.input,
        outputPath: options.output,
        frameSourcePath,
    });
    process.stdout.write(
        `wrote ${path.relative(repositoryRoot, options.output)}\n`,
    );
} else {
    const clients = options.client
        ? [options.client]
        : ["remarkable", "android"];
    let written = 0;

    for (const client of clients) {
        let selected;
        try {
            selected = selectScenarios(client, options.scenario);
        } catch (error) {
            usage(error.message);
        }

        for (const [, scenario] of selected) {
            const inputPath = path.join(options.inputDir, scenario.output);
            if (!(await exists(inputPath))) {
                if (options.scenario) {
                    throw new Error(`Missing source screenshot: ${inputPath}`);
                }
                continue;
            }

            const outputPath = path.join(options.outDir, scenario.output);
            await frameScreenshot({
                client,
                inputPath,
                outputPath,
                frameSourcePath,
            });
            process.stdout.write(
                `wrote ${path.relative(repositoryRoot, outputPath)}\n`,
            );
            written += 1;
        }
    }

    if (written === 0) {
        throw new Error("No source screenshots were found to frame");
    }
}
