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
    "apps/mobile/src/testMode/fixture.generated.ts",
);

const fixture = await loadFixture(sourcePath);
const output = `// Generated test data. Run pnpm mobile:test:fixture after editing the shared fixture.\nimport type { TestFixture } from "./types";\n\nexport const testFixture: TestFixture = ${JSON.stringify(fixture, null, 4)};\n`;

const previous = await readFile(outputPath, "utf8").catch(() => "");
if (previous !== output) {
    if (process.argv.includes("--check")) {
        throw new Error(
            "Mobile test fixture is stale; run pnpm mobile:test:fixture",
        );
    }
    await writeFile(outputPath, output);
    process.stdout.write(
        `wrote ${path.relative(repositoryRoot, outputPath)}\n`,
    );
}
