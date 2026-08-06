#!/usr/bin/env node
// Migrate a copy of the device's data/ dir to the `editedAt` timestamp name. The client's single
// timestamp has always been an edit-time — the last-write-wins merge key the sync wire exchanges —
// but it was spelled `updatedAt`, the name the backend uses for its server-stamped audit field. The
// backend renamed the wire field to `editedAt`; this renames it on disk so nothing translates.
//
// Input — a copy of data/ off the device, e.g. from `make backup`:
//   roster.json    { habits: [{ id, name, polarity, hideFromSleep, createdAt, updatedAt, deletedAt }] }
//   YYYY-MM.json   { month, entries: [{ habitId, date, outcome, updatedAt, deletedAt }] }
//   sync.json      { lastSyncedAt }   (copied unchanged — lastSyncedAt is a real last-sync time)
//
// Output — a fresh dir to rsync back over the device's data/ (see the README's
// "Upgrading across a storage-format change"): the same files with each row's `updatedAt` renamed
// to `editedAt`. Values are untouched, so no merge changes outcome.
//
// The app carries no migration code and refuses to write to a file it cannot read (ADR 0006), so
// this runs off-device, once, with the app closed and before the new build is deployed. Delete this
// script once the device has been migrated.
//
// Usage:
//   node scripts/migrate-edited-at.mjs <input-dir> <output-dir> [--force]

import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    statSync,
    unlinkSync,
    writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const MONTH_FILE = /^\d{4}-\d{2}\.json$/;

const [, , inputArg, outputArg, ...flags] = process.argv;

if (!inputArg || !outputArg) {
    usage("Missing required input or output path.");
}

const options = parseFlags(flags);
const inputDir = resolve(inputArg);
const outputDir = resolve(outputArg);

if (!existsSync(inputDir) || !statSync(inputDir).isDirectory()) {
    die(`Input is not a directory: ${inputDir}`);
}

if (inputDir === outputDir) {
    die(
        "Input and output must be different paths. Write to a fresh directory, inspect it, then push it to the device.",
    );
}

if (existsSync(outputDir) && !options.force) {
    die(
        `Output already exists: ${outputDir}. Pass --force to overwrite the generated files there.`,
    );
}

const source = readSource(inputDir);
const migrated = migrate(source);

write(inputDir, outputDir, migrated);
verify(outputDir, migrated);
report(migrated, outputDir);

function parseFlags(args) {
    const parsed = { force: false };

    args.forEach((flag) => {
        if (flag !== "--force") {
            usage(`Unknown option: ${flag}`);
        }
        parsed.force = true;
    });

    return parsed;
}

// --- read ------------------------------------------------------------------

function readSource(dir) {
    const rosterPath = join(dir, "roster.json");
    if (!existsSync(rosterPath)) {
        die(`Missing roster.json in ${dir}.`);
    }

    const roster = readJson(rosterPath);
    if (!roster || !Array.isArray(roster.habits)) {
        die(`Expected ${rosterPath} to contain { "habits": [...] }.`);
    }

    // Two shapes to turn away: one this script has already converted, and the pre-polarity shape an
    // earlier migration handled (recover that script from git history and run it first).
    if (roster.habits.some((habit) => habit && habit.editedAt !== undefined)) {
        die(
            `${rosterPath} already carries editedAt — this data has been migrated. Nothing to do.`,
        );
    }

    if (roster.habits.some((habit) => !habit || !habit.polarity)) {
        die(
            `${rosterPath} has a habit without polarity — that is the pre-polarity shape, which this script does not read.`,
        );
    }

    return {
        roster,
        rosterPath,
        months: readMonths(dir),
        passthrough: passthroughFiles(dir),
    };
}

function readMonths(dir) {
    return readdirSync(dir)
        .filter((name) => MONTH_FILE.test(name))
        .sort()
        .map((name) => readMonth(join(dir, name), name.slice(0, 7)));
}

function readMonth(path, month) {
    const data = readJson(path);
    if (!data || data.month !== month) {
        die(`Expected ${path} to contain { "month": "${month}", … }.`);
    }

    if (!Array.isArray(data.entries)) {
        die(
            `Expected ${path} to contain { "entries": [ … ] } — nested cells are the pre-row shape, which this script does not read.`,
        );
    }

    if (data.entries.some((row) => row && row.editedAt !== undefined)) {
        die(
            `${path} already holds editedAt rows — this data has been migrated. Nothing to do.`,
        );
    }

    return { month, entries: data.entries, path };
}

// Anything this script does not rewrite is carried across untouched, so pushing the output back
// with `rsync --delete` cannot drop a file it simply did not know about. sync.json is among them:
// its `lastSyncedAt` is a genuine last-sync time, not an edit-time.
function passthroughFiles(dir) {
    return readdirSync(dir).filter(
        (name) => name !== "roster.json" && !MONTH_FILE.test(name),
    );
}

// --- migrate ---------------------------------------------------------------

function migrate(source) {
    const habits = source.roster.habits.map((habit) =>
        renamed(habit, `${source.rosterPath} habit ${habit.id}`),
    );

    const months = source.months.map((month) => ({
        month: month.month,
        path: month.path,
        entries: month.entries.map((row, index) =>
            renamed(row, `${month.path} entries[${index}]`),
        ),
    }));

    return { roster: { habits }, months, passthrough: source.passthrough };
}

// The rename, key order preserved: `updatedAt` out, `editedAt` in its place, every other field
// untouched. A row with no usable timestamp is refused rather than given an invented one — an
// invented edit-time would win or lose merges on the server that the real one would not.
function renamed(row, where) {
    if (!validTimestamp(row.updatedAt)) {
        die(
            `${where} has no usable updatedAt: ${JSON.stringify(row.updatedAt)}`,
        );
    }

    return Object.keys(row).reduce((out, key) => {
        if (key === "updatedAt") {
            out.editedAt = row.updatedAt;
            return out;
        }

        out[key] = row[key];
        return out;
    }, {});
}

// --- write and verify ------------------------------------------------------

function write(sourceDir, dir, migrated) {
    mkdirSync(dir, { recursive: true });
    clearGeneratedFiles(dir);

    writeJson(join(dir, "roster.json"), migrated.roster);
    migrated.months.forEach((month) =>
        writeJson(join(dir, `${month.month}.json`), {
            month: month.month,
            entries: month.entries,
        }),
    );

    migrated.passthrough.forEach((name) =>
        copyFileSync(join(sourceDir, name), join(dir, name)),
    );
}

// Read the output back rather than trusting the in-memory rows: a serialization bug that drops rows
// or leaves an old key behind must not be reported as a clean migration.
function verify(dir, migrated) {
    assertRenamed(
        join(dir, "roster.json"),
        readJson(join(dir, "roster.json")).habits,
        migrated.roster.habits.length,
    );

    migrated.months.forEach((month) => {
        const path = join(dir, `${month.month}.json`);
        assertRenamed(path, readJson(path).entries, month.entries.length);
    });
}

function assertRenamed(path, rows, expected) {
    if (rows.length !== expected) {
        die(
            `Verification failed: ${path} holds ${rows.length} rows, expected ${expected}.`,
        );
    }

    if (
        rows.some(
            (row) =>
                row.updatedAt !== undefined || !validTimestamp(row.editedAt),
        )
    ) {
        die(
            `Verification failed: ${path} still holds a row without a valid editedAt.`,
        );
    }
}

function report(migrated, dir) {
    console.log(
        `roster.json  ${migrated.roster.habits.length} habit row(s) renamed`,
    );

    migrated.months.forEach((month) =>
        console.log(
            `${month.month}.json  ${month.entries.length} entry row(s) renamed`,
        ),
    );

    migrated.passthrough.forEach((name) =>
        console.log(`${name}  copied unchanged`),
    );

    const written = migrated.months.length + migrated.passthrough.length + 1;
    console.log(`\nWrote ${written} file(s) to ${dir}`);
}

// --- helpers ---------------------------------------------------------------

function clearGeneratedFiles(dir) {
    readdirSync(dir)
        .filter((name) => name === "roster.json" || MONTH_FILE.test(name))
        .forEach((name) => unlinkSync(join(dir, name)));
}

function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
        die(`Could not read JSON from ${path}: ${error.message}`);
    }
}

function writeJson(path, value) {
    writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

function validTimestamp(value) {
    return Number.isSafeInteger(value) && value > 0;
}

function usage(message) {
    console.error(`${message}\n`);
    console.error(
        "Usage: node scripts/migrate-edited-at.mjs <input-dir> <output-dir> [--force]",
    );
    process.exit(1);
}

function die(message) {
    console.error(message);
    process.exit(1);
}
