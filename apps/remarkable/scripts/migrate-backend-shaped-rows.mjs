#!/usr/bin/env node
// Migrate a copy of the device's data/ dir to the backend-shaped storage: habits carry a
// `polarity` enum and a `createdAt`, deletes are roster tombstones rather than a sync.json
// sidecar, and a month file holds flat (habitId, date) rows instead of nested cells.
//
// Input — a copy of data/ off the device, e.g. from `make backup`:
//   roster.json    { habits: [{ id, name, negative, hideFromSleep, updatedAt }] }
//   YYYY-MM.json   { month, entries: { habitId: { date: { state, updatedAt } } } }
//   sync.json      { tombstones: [{ id, deletedAt }], lastSyncedAt }   (absent if never synced)
//
// Output — a fresh dir to push back with `make restore-data DIR=<dir>`:
//   roster.json    { habits: [ …alive rows, …tombstone rows ] }, each row
//                  { id, name, polarity, hideFromSleep, createdAt, updatedAt, deletedAt }
//   YYYY-MM.json   { month, entries: [{ habitId, date, outcome, updatedAt, deletedAt }] }
//   sync.json      { lastSyncedAt }
//
// The app carries no migration code and refuses to write to a file it cannot read, so this runs
// off-device, once, with the app closed and before the new build is deployed.
//
// Usage:
//   node scripts/migrate-backend-shaped-rows.mjs <input-dir> <output-dir>
//        [--created-at <epoch-ms|iso>] [--drop-pending-deletes] [--force]

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
import { basename, join, resolve } from "node:path";

const POSITIVE = "Positive";
const NEGATIVE = "Negative";
const X = "x";
const O = "o";
const CLEARED = "";

const MONTH_FILE = /^\d{4}-\d{2}\.json$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DELETED_HABIT_NAME = "(deleted)";

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
const migrated = migrate(source, options);

write(inputDir, outputDir, migrated);
verify(outputDir, migrated);
report(source, migrated, outputDir);

function parseFlags(args) {
    const parsed = {
        force: false,
        dropPendingDeletes: false,
        createdAt: Date.now(),
    };

    for (let i = 0; i < args.length; i++) {
        const flag = args[i];
        if (flag === "--force") {
            parsed.force = true;
            continue;
        }

        if (flag === "--drop-pending-deletes") {
            parsed.dropPendingDeletes = true;
            continue;
        }

        if (flag === "--created-at") {
            const value = args[++i];
            if (!value) {
                usage("--created-at requires an epoch-ms or ISO-8601 value.");
            }
            parsed.createdAt = parseTimestamp(value);
            continue;
        }

        usage(`Unknown option: ${flag}`);
    }

    return parsed;
}

function parseTimestamp(value) {
    if (/^\d+$/.test(value)) {
        const epochMs = Number(value);
        if (Number.isSafeInteger(epochMs)) return epochMs;
    }

    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
        usage(`Invalid --created-at value: ${value}`);
    }

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

    if (roster.habits.some((habit) => habit && habit.polarity)) {
        die(
            `${rosterPath} already carries polarity — this data has been migrated. Nothing to do.`,
        );
    }

    return {
        roster,
        months: readMonths(dir),
        sync: readSync(dir),
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

    if (Array.isArray(data.entries)) {
        die(
            `${path} already holds flat entry rows — this data has been migrated. Nothing to do.`,
        );
    }

    if (!isPlainObject(data.entries)) {
        die(`Expected ${path} to contain { "entries": { … } }.`);
    }

    return { month, entries: data.entries, path };
}

function readSync(dir) {
    const path = join(dir, "sync.json");
    if (!existsSync(path)) {
        return { tombstones: [], lastSyncedAt: 0 };
    }

    const data = readJson(path);
    if (!isPlainObject(data)) {
        die(`Expected ${path} to contain an object.`);
    }

    return {
        tombstones: Array.isArray(data.tombstones) ? data.tombstones : [],
        lastSyncedAt: validTimestamp(data.lastSyncedAt) ? data.lastSyncedAt : 0,
    };
}

// Anything this script does not rewrite is carried across untouched, so pushing the output back
// with `rsync --delete` cannot drop a file it simply did not know about.
function passthroughFiles(dir) {
    return readdirSync(dir).filter(
        (name) =>
            name !== "roster.json" &&
            name !== "sync.json" &&
            !MONTH_FILE.test(name),
    );
}

// --- migrate ---------------------------------------------------------------

function migrate(source, options) {
    const firstMarkedByHabitId = firstMarkedDates(source.months);
    const alive = source.roster.habits.map((habit, index) =>
        migrateHabit(habit, index, firstMarkedByHabitId, options.createdAt),
    );

    const aliveIds = new Set(alive.map((habit) => habit.id));
    const tombstones = migrateTombstones(
        source.sync.tombstones,
        aliveIds,
        firstMarkedByHabitId,
        options,
    );

    const months = source.months.map((month) =>
        migrateMonth(month, aliveIds, options.createdAt),
    );

    return {
        roster: { habits: alive.concat(tombstones) },
        aliveCount: alive.length,
        tombstones,
        months,
        sync: { lastSyncedAt: source.sync.lastSyncedAt },
        passthrough: source.passthrough,
    };
}

// A habit's create-time is unknown; the earliest day it was ever marked is the closest honest
// answer, and it keeps a future streak feature from seeing entries predating their habit.
function firstMarkedDates(months) {
    const earliest = new Map();

    months.forEach((month) =>
        Object.keys(month.entries).forEach((habitId) =>
            Object.keys(month.entries[habitId] || {}).forEach((date) => {
                const known = earliest.get(habitId);
                if (!known || date < known) earliest.set(habitId, date);
            }),
        ),
    );

    return earliest;
}

function migrateHabit(habit, index, firstMarkedByHabitId, fallbackCreatedAt) {
    const where = `roster.habits[${index}]`;
    if (!habit || typeof habit.name !== "string" || habit.name.trim() === "") {
        die(`Expected ${where}.name to be a non-empty string.`);
    }
    if (typeof habit.id !== "string" || habit.id === "") {
        die(`Expected ${where}.id to be a non-empty string.`);
    }

    const updatedAt = validTimestamp(habit.updatedAt)
        ? habit.updatedAt
        : fallbackCreatedAt;

    return {
        id: habit.id,
        name: habit.name,
        polarity: habit.negative ? NEGATIVE : POSITIVE,
        hideFromSleep: !!habit.hideFromSleep,
        createdAt: createdAtFor(
            habit.id,
            firstMarkedByHabitId,
            fallbackCreatedAt,
        ),
        updatedAt,
        deletedAt: null,
    };
}

function createdAtFor(habitId, firstMarkedByHabitId, fallback) {
    const firstMarked = firstMarkedByHabitId.get(habitId);

    return firstMarked ? Date.parse(`${firstMarked}T00:00:00Z`) : fallback;
}

// Deletes made under the old layout live in sync.json and were never pushed. They become roster
// tombstones, or the first sync on the new build resurrects the habits from the server's copy.
// The habit's name and polarity died with the roster row, so a placeholder stands in — the
// backend ignores a tombstone's payload.
function migrateTombstones(
    tombstones,
    aliveIds,
    firstMarkedByHabitId,
    options,
) {
    if (options.dropPendingDeletes) return [];

    return tombstones
        .filter((tombstone) => isUsableTombstone(tombstone, aliveIds))
        .map((tombstone) => ({
            id: tombstone.id,
            name: DELETED_HABIT_NAME,
            polarity: POSITIVE,
            hideFromSleep: false,
            createdAt: createdAtFor(
                tombstone.id,
                firstMarkedByHabitId,
                tombstone.deletedAt,
            ),
            updatedAt: tombstone.deletedAt,
            deletedAt: tombstone.deletedAt,
        }));
}

function isUsableTombstone(tombstone, aliveIds) {
    if (!tombstone || typeof tombstone.id !== "string") {
        warn("Skipping a sync.json tombstone with no id.");
        return false;
    }
    if (!validTimestamp(tombstone.deletedAt)) {
        warn(`Skipping sync.json tombstone ${tombstone.id}: no deletedAt.`);
        return false;
    }
    if (aliveIds.has(tombstone.id)) {
        warn(
            `Skipping sync.json tombstone ${tombstone.id}: the habit is alive in the roster.`,
        );
        return false;
    }

    return true;
}

function migrateMonth(month, aliveIds, fallbackUpdatedAt) {
    const rows = [];
    let orphaned = 0;
    let cells = 0;

    Object.keys(month.entries).forEach((habitId) => {
        const byDate = month.entries[habitId];
        if (!isPlainObject(byDate)) {
            die(`Expected ${month.path} entries.${habitId} to be an object.`);
        }

        Object.keys(byDate).forEach((date) => {
            cells++;
            assertDate(date, month, habitId);

            if (!aliveIds.has(habitId)) {
                orphaned++;
                return;
            }

            rows.push(
                migrateCell(
                    habitId,
                    date,
                    byDate[date],
                    month,
                    fallbackUpdatedAt,
                ),
            );
        });
    });

    return { month: month.month, entries: rows, cells, orphaned };
}

function migrateCell(habitId, date, cell, month, fallbackUpdatedAt) {
    if (!isPlainObject(cell)) {
        die(
            `Expected ${month.path} entries.${habitId}.${date} to be { state, updatedAt }.`,
        );
    }

    const state = typeof cell.state === "string" ? cell.state : CLEARED;
    if (state !== X && state !== O && state !== CLEARED) {
        die(
            `Invalid state at ${month.path} entries.${habitId}.${date}: expected "x", "o" or "".`,
        );
    }

    const updatedAt = validTimestamp(cell.updatedAt)
        ? cell.updatedAt
        : fallbackUpdatedAt;
    const cleared = state === CLEARED;

    return {
        habitId,
        date,
        // A cleared cell recorded no prior outcome, and a tombstone keeps the outcome it had:
        // X is what its wire form always sent.
        outcome: cleared ? X : state,
        updatedAt,
        deletedAt: cleared ? updatedAt : null,
    };
}

function assertDate(date, month, habitId) {
    if (!DATE_KEY.test(date)) {
        die(`Invalid date key at ${month.path} entries.${habitId}: ${date}`);
    }
    if (date.slice(0, 7) !== month.month) {
        die(`Date ${date} does not belong in ${month.path}.`);
    }
}

// --- write and verify ------------------------------------------------------

function write(sourceDir, dir, migrated) {
    mkdirSync(dir, { recursive: true });
    clearGeneratedFiles(dir);

    writeJson(join(dir, "roster.json"), migrated.roster);
    writeJson(join(dir, "sync.json"), migrated.sync);
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

// Read the output back rather than trusting the in-memory counts: a serialization bug that drops
// entries must not be reported as a clean migration.
function verify(dir, migrated) {
    const roster = readJson(join(dir, "roster.json"));
    const expectedHabits = migrated.aliveCount + migrated.tombstones.length;
    if (roster.habits.length !== expectedHabits) {
        die(
            `Verification failed: roster.json holds ${roster.habits.length} habits, expected ${expectedHabits}.`,
        );
    }

    migrated.months.forEach((month) => {
        const path = join(dir, `${month.month}.json`);
        const written = readJson(path);
        if (written.entries.length !== month.entries.length) {
            die(
                `Verification failed: ${path} holds ${written.entries.length} rows, expected ${month.entries.length}.`,
            );
        }
    });
}

function report(source, migrated, dir) {
    console.log(
        `roster.json  ${source.roster.habits.length} habits -> ${migrated.aliveCount} alive + ${migrated.tombstones.length} tombstone(s)`,
    );

    migrated.months.forEach((month) => {
        const dropped = month.orphaned
            ? `  (${month.orphaned} dropped: entries of habits no longer in the roster)`
            : "";
        console.log(
            `${month.month}.json  ${month.cells} cells -> ${month.entries.length} rows${dropped}`,
        );
    });

    source.passthrough.forEach((name) =>
        console.log(`${name}  copied unchanged`),
    );

    const written = migrated.months.length + migrated.passthrough.length + 2;
    console.log(`\nWrote ${written} file(s) to ${dir}`);
}

// --- helpers ---------------------------------------------------------------

function clearGeneratedFiles(dir) {
    readdirSync(dir)
        .filter(
            (name) =>
                name === "roster.json" ||
                name === "sync.json" ||
                MONTH_FILE.test(name),
        )
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

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validTimestamp(value) {
    return Number.isSafeInteger(value) && value > 0;
}

function warn(message) {
    console.warn(`warning: ${message}`);
}

function usage(message) {
    if (message) console.error(message);
    console.error(
        `Usage: node ${basename(process.argv[1])} <input-dir> <output-dir> [--created-at <epoch-ms|iso>] [--drop-pending-deletes] [--force]`,
    );
    process.exit(1);
}

function die(message) {
    console.error(message);
    process.exit(1);
}
