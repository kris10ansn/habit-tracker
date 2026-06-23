#!/usr/bin/env node
// Migrate reMarkable habit data to the sync-ready on-device JSON layout.
//
// Inputs accepted:
//   - legacy habits.json: [{ name, negative, hideFromSleep, entries }]
//   - data directory: roster.json + YYYY-MM.json files
//
// Output:
//   - roster.json with UUID ids and per-habit updatedAt
//   - YYYY-MM.json files whose entry cells are { state: "x"|"o"|"", updatedAt: epochMs }
//
// Usage:
//   node scripts/migrate-habits-sync.mjs <legacy-habits.json|data-dir> <output-data-dir>
//   node scripts/migrate-habits-sync.mjs <input> <output-data-dir> --edited-at 2026-06-23T12:00:00Z
//   node scripts/migrate-habits-sync.mjs <input> <output-data-dir> --force

import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    statSync,
    unlinkSync,
    writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const [, , inputArg, outputArg, ...flags] = process.argv;

if (!inputArg || !outputArg) {
    usage("Missing required input or output path.");
}

const options = parseFlags(flags);
const inputPath = resolve(inputArg);
const outputDir = resolve(outputArg);
const migratedAt = options.editedAt ?? Date.now();

if (!existsSync(inputPath)) {
    die(`Input does not exist: ${inputPath}`);
}

if (inputPath === outputDir) {
    die(
        "Input and output must be different paths. Write to a fresh directory, inspect it, then deploy it.",
    );
}

if (existsSync(outputDir) && !options.force) {
    die(
        `Output already exists: ${outputDir}. Pass --force to overwrite generated JSON files there.`,
    );
}

const source = loadSource(inputPath);
const migrated = migrate(source, migratedAt);
writeMigrated(outputDir, migrated);

console.log(
    `Wrote roster.json (${migrated.roster.habits.length} habits) and ${migrated.months.size} month file(s) to ${outputDir}`,
);

if (migrated.rekeyedIds > 0) {
    console.log(
        `Replaced ${migrated.rekeyedIds} non-UUID habit id(s) with UUIDs for backend sync.`,
    );
}

function parseFlags(args) {
    const parsed = { force: false, editedAt: undefined };

    for (let i = 0; i < args.length; i++) {
        const flag = args[i];
        if (flag === "--force") {
            parsed.force = true;
            continue;
        }

        if (flag === "--edited-at") {
            const value = args[++i];
            if (!value)
                usage("--edited-at requires an epoch-ms or ISO-8601 value.");
            parsed.editedAt = parseEditedAt(value);
            continue;
        }

        usage(`Unknown option: ${flag}`);
    }

    return parsed;
}

function parseEditedAt(value) {
    if (/^\d+$/.test(value)) {
        const ms = Number(value);
        if (Number.isSafeInteger(ms)) return ms;
    }

    const ms = Date.parse(value);
    if (Number.isNaN(ms)) {
        usage(`Invalid --edited-at value: ${value}`);
    }

    return ms;
}

function loadSource(path) {
    const stats = statSync(path);
    if (stats.isDirectory()) {
        return loadDataDir(path);
    }

    const data = readJson(path);
    if (!Array.isArray(data)) {
        die(
            `Expected ${path} to be a legacy habits array or a data directory.`,
        );
    }

    return { kind: "legacy", habits: data };
}

function loadDataDir(dir) {
    const rosterPath = join(dir, "roster.json");
    if (!existsSync(rosterPath)) {
        die(`Missing roster.json in data directory: ${dir}`);
    }

    const roster = readJson(rosterPath);
    if (!roster || !Array.isArray(roster.habits)) {
        die(`Expected ${rosterPath} to contain { "habits": [...] }.`);
    }

    const monthFiles = readdirSync(dir)
        .filter((name) => /^\d{4}-\d{2}\.json$/.test(name))
        .sort();

    const months = monthFiles.map((file) => {
        const path = join(dir, file);
        const data = readJson(path);
        const month = file.slice(0, 7);
        if (!data || data.month !== month || !isPlainObject(data.entries)) {
            die(
                `Expected ${path} to contain { "month": "${month}", "entries": {...} }.`,
            );
        }

        return data;
    });

    return { kind: "partitioned", roster, months };
}

function migrate(source, editedAt) {
    if (source.kind === "legacy") {
        return migrateLegacy(source.habits, editedAt);
    }

    return migratePartitioned(source.roster, source.months, editedAt);
}

function migrateLegacy(habits, editedAt) {
    const rosterHabits = [];
    const months = new Map();

    habits.forEach((habit, index) => {
        const id = uuidFor(habit.id);
        rosterHabits.push(migrateHabit(habit, id, editedAt, `habit[${index}]`));

        const entries = isPlainObject(habit.entries) ? habit.entries : {};
        Object.entries(entries).forEach(([date, cell]) => {
            assertDateKey(date, `habit[${index}].entries`);
            const month = date.slice(0, 7);
            const monthEntries = mapGetOrSet(months, month, () => ({}));
            const habitEntries = (monthEntries[id] = monthEntries[id] || {});
            habitEntries[date] = migrateCell(
                cell,
                editedAt,
                `habit[${index}].entries.${date}`,
            );
        });
    });

    return {
        roster: { habits: rosterHabits },
        months,
        rekeyedIds: 0,
    };
}

function migratePartitioned(roster, monthFiles, editedAt) {
    const idMap = new Map();
    let rekeyedIds = 0;

    const rosterHabits = roster.habits.map((habit, index) => {
        const oldId = habit.id || `__missing_${index}`;
        const id = uuidFor(habit.id);
        idMap.set(oldId, id);
        if (habit.id !== id) rekeyedIds++;
        return migrateHabit(habit, id, editedAt, `roster.habits[${index}]`);
    });

    const months = new Map();
    monthFiles.forEach((monthFile) => {
        const migratedEntries = {};

        Object.entries(monthFile.entries).forEach(([oldHabitId, entries]) => {
            if (!isPlainObject(entries)) {
                die(
                    `Expected entries for habit ${oldHabitId} in ${monthFile.month} to be an object.`,
                );
            }

            const habitId = mappedUuid(idMap, oldHabitId);
            const habitEntries = {};

            Object.entries(entries).forEach(([date, cell]) => {
                assertDateKey(date, `${monthFile.month}.${oldHabitId}`);
                if (date.slice(0, 7) !== monthFile.month) {
                    die(
                        `Date ${date} does not belong in month file ${monthFile.month}.`,
                    );
                }
                habitEntries[date] = migrateCell(
                    cell,
                    editedAt,
                    `${monthFile.month}.${oldHabitId}.${date}`,
                );
            });

            if (Object.keys(habitEntries).length > 0) {
                migratedEntries[habitId] = habitEntries;
            }
        });

        months.set(monthFile.month, migratedEntries);
    });

    return {
        roster: { habits: rosterHabits },
        months,
        rekeyedIds,
    };
}

function migrateHabit(habit, id, editedAt, where) {
    if (!habit || typeof habit.name !== "string" || habit.name.trim() === "") {
        die(`Expected ${where}.name to be a non-empty string.`);
    }

    return {
        id,
        name: habit.name,
        negative: !!habit.negative,
        hideFromSleep: !!habit.hideFromSleep,
        updatedAt: validTimestamp(habit.updatedAt) ? habit.updatedAt : editedAt,
    };
}

function migrateCell(cell, editedAt, where) {
    if (typeof cell === "string") {
        assertState(cell, where);
        return { state: cell, updatedAt: editedAt };
    }

    if (isPlainObject(cell)) {
        const state = entryState(cell);
        assertState(state, `${where}.state`);
        return {
            state,
            updatedAt: entryUpdatedAt(cell, editedAt),
        };
    }

    die(
        `Expected ${where} to be "x", "o", "", or { state, updatedAt }. Legacy { s, t } is also accepted as input.`,
    );
}

function entryState(cell) {
    if (typeof cell.state === "string") return cell.state;
    if (typeof cell.s === "string") return cell.s;
    return "";
}

function entryUpdatedAt(cell, fallback) {
    if (validTimestamp(cell.updatedAt)) return cell.updatedAt;
    if (validTimestamp(cell.t)) return cell.t;
    return fallback;
}

function writeMigrated(dir, migrated) {
    mkdirSync(dir, { recursive: true });
    clearGeneratedFiles(dir);
    writeJson(join(dir, "roster.json"), migrated.roster);

    [...migrated.months.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([month, entries]) => {
            writeJson(join(dir, `${month}.json`), { month, entries });
        });
}

function uuidFor(value) {
    return typeof value === "string" && isUuid(value) ? value : randomUUID();
}

function mappedUuid(idMap, oldId) {
    if (!idMap.has(oldId)) {
        idMap.set(oldId, uuidFor(oldId));
    }
    return idMap.get(oldId);
}

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );
}

function validTimestamp(value) {
    return Number.isSafeInteger(value) && value > 0;
}

function assertState(value, where) {
    if (value !== "x" && value !== "o" && value !== "") {
        die(`Invalid state at ${where}: expected "x", "o", or "".`);
    }
}

function assertDateKey(value, where) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        die(`Invalid date key at ${where}: ${value}`);
    }
}

function mapGetOrSet(map, key, factory) {
    if (!map.has(key)) map.set(key, factory());
    return map.get(key);
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

function clearGeneratedFiles(dir) {
    readdirSync(dir)
        .filter(
            (name) =>
                name === "roster.json" || /^\d{4}-\d{2}\.json$/.test(name),
        )
        .forEach((name) => unlinkSync(join(dir, name)));
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function usage(message) {
    if (message) console.error(message);
    console.error(
        `Usage: node ${basename(process.argv[1])} <legacy-habits.json|data-dir> <output-data-dir> [--edited-at <epoch-ms|iso>] [--force]`,
    );
    process.exit(1);
}

function die(message) {
    console.error(message);
    process.exit(1);
}
