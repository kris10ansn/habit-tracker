#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeRemarkableShowcase } from "./lib/device-frames.mjs";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const options = {
    input: path.join(
        repositoryRoot,
        "docs/assets/screenshots/remarkable-suspend.png",
    ),
    output: path.join(
        repositoryRoot,
        "docs/assets/screenshots/framed/remarkable-showcase.png",
    ),
};
const arguments_ = process.argv.slice(2);
for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--") continue;
    if (
        !["--input", "--output"].includes(argument) ||
        !arguments_[index + 1] ||
        arguments_[index + 1].startsWith("--")
    ) {
        process.stderr.write(
            "Usage: pnpm screenshots:showcase [--input <landscape.png>] [--output <showcase.png>]\n",
        );
        process.exit(2);
    }
    options[argument.slice(2)] = path.resolve(arguments_[++index]);
}
await composeRemarkableShowcase({
    inputPath: options.input,
    outputPath: options.output,
});
process.stdout.write(
    `wrote ${path.relative(repositoryRoot, options.output)}\n`,
);
