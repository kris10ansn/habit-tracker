#!/usr/bin/env node
// Migrate the legacy single-file habits.json (a bare array where each habit
// carries its entire entry history) into the month-partitioned layout: a roster
// file plus one file per month. See docs/adr/0002-month-partitioned-habit-storage.md.
//
// Usage:
//   node scripts/migrate-habits.mjs <legacy-habits.json> <output-data-dir>
//
// Run off-device on a copy of the device's habits.json, then place the emitted
// files in the device's habit-tracker/data/ directory yourself. The app carries
// no migration code — it only ever reads the new layout.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const [, , legacyPath, outDir] = process.argv;

if (!legacyPath || !outDir) {
    console.error(
        "Usage: node scripts/migrate-habits.mjs <legacy-habits.json> <output-data-dir>",
    );
    process.exit(1);
}

const legacy = JSON.parse(readFileSync(legacyPath, "utf8"));

if (!Array.isArray(legacy)) {
    console.error(`Expected ${legacyPath} to contain a JSON array of habits.`);
    process.exit(1);
}

const monthOf = (dateKey) => dateKey.slice(0, 7);

// roster: identity + config, no entries. months: { "YYYY-MM": { id: { dateKey: state } } }.
const roster = [];
const months = {};

for (const habit of legacy) {
    const id = randomUUID();
    roster.push({
        id,
        name: habit.name,
        negative: !!habit.negative,
        hideFromSleep: !!habit.hideFromSleep,
    });

    const entries = habit.entries || {};
    for (const [dateKey, state] of Object.entries(entries)) {
        const month = monthOf(dateKey);
        const bucket = (months[month] = months[month] || {});
        const habitEntries = (bucket[id] = bucket[id] || {});
        habitEntries[dateKey] = state;
    }
}

mkdirSync(outDir, { recursive: true });

const write = (name, value) => {
    const path = join(outDir, name);
    writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
    return path;
};

write("roster.json", { habits: roster });
const monthFiles = Object.keys(months)
    .sort()
    .map((month) => write(`${month}.json`, { month, entries: months[month] }));

console.log(
    `Wrote roster.json (${roster.length} habits) and ${monthFiles.length} month file(s) to ${outDir}`,
);
