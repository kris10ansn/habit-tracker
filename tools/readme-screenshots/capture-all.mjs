#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));

execFileSync(
    process.execPath,
    [path.join(directory, "capture-remarkable.mjs")],
    {
        stdio: "inherit",
    },
);
execFileSync(
    process.execPath,
    [path.join(directory, "capture-android.mjs"), ...process.argv.slice(2)],
    { stdio: "inherit" },
);
