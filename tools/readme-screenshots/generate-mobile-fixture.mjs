#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadFixture } from "./lib/fixture.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../..");
const sourcePath = path.join(directory, "fixture.json");
const outputPath = path.join(
    repositoryRoot,
    "apps/mobile/src/screenshots/fixture.generated.ts",
);

const fixture = await loadFixture(sourcePath);
const output = `// Generated from tools/readme-screenshots/fixture.json. Do not edit by hand.\nimport type { ScreenshotFixture } from "./types";\n\nexport const screenshotFixture: ScreenshotFixture = ${JSON.stringify(fixture, null, 4)};\n`;

const previous = await readFile(outputPath, "utf8").catch(() => "");
if (previous !== output) {
    if (process.argv.includes("--check")) {
        throw new Error(
            "Mobile screenshot fixture is stale; run pnpm screenshots:android:fixture",
        );
    }
    await writeFile(outputPath, output);
    process.stdout.write(
        `wrote ${path.relative(repositoryRoot, outputPath)}\n`,
    );
}
