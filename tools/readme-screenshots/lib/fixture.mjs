import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAIRING_CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const knownPolarities = new Set(["Positive", "Negative"]);
const knownOutcomes = new Set(["Success", "Failure"]);

function requireValue(condition, message) {
    if (!condition) throw new Error(`Invalid screenshot fixture: ${message}`);
}

function requireTimestamp(value, label) {
    requireValue(
        Number.isSafeInteger(value) && value > 0,
        `${label} must be an epoch-ms integer`,
    );
}

export async function loadFixture(filePath) {
    const fixture = JSON.parse(await readFile(filePath, "utf8"));
    validateFixture(fixture);
    return fixture;
}

export function validateFixture(fixture) {
    requireValue(
        fixture && typeof fixture === "object",
        "root must be an object",
    );
    requireValue(DATE.test(fixture.today), "today must be YYYY-MM-DD");
    requireTimestamp(fixture.now, "now");
    requireValue(
        new Date(fixture.now).toISOString().slice(0, 10) === fixture.today,
        "now must fall on today in UTC",
    );
    requireValue(
        Array.isArray(fixture.habits) && fixture.habits.length > 0,
        "habits must be non-empty",
    );
    requireValue(Array.isArray(fixture.entries), "entries must be an array");
    requireValue(
        Array.isArray(fixture.sessions) && fixture.sessions.length > 0,
        "sessions must be non-empty",
    );

    const habitIds = new Set();
    const positions = new Set();
    for (const habit of fixture.habits) {
        requireValue(
            UUID.test(habit.id),
            `habit ${habit.name ?? "<unnamed>"} has an invalid id`,
        );
        requireValue(!habitIds.has(habit.id), `duplicate habit id ${habit.id}`);
        requireValue(
            typeof habit.name === "string" && habit.name.trim(),
            `habit ${habit.id} needs a name`,
        );
        requireValue(
            knownPolarities.has(habit.polarity),
            `habit ${habit.id} has unknown polarity ${habit.polarity}`,
        );
        requireValue(
            Number.isInteger(habit.position) && habit.position >= 0,
            `habit ${habit.id} has an invalid position`,
        );
        requireValue(
            !positions.has(habit.position),
            `duplicate habit position ${habit.position}`,
        );
        requireValue(
            typeof habit.isPrivate === "boolean",
            `habit ${habit.id} isPrivate must be boolean`,
        );
        requireTimestamp(habit.createdAt, `habit ${habit.id} createdAt`);
        requireTimestamp(habit.editedAt, `habit ${habit.id} editedAt`);
        requireValue(
            habit.deletedAt === null,
            `screenshot habit ${habit.id} must not be deleted`,
        );
        habitIds.add(habit.id);
        positions.add(habit.position);
    }
    requireValue(
        [...positions]
            .sort((a, b) => a - b)
            .every((position, index) => position === index),
        "habit positions must be contiguous from zero",
    );

    const entryKeys = new Set();
    for (const entry of fixture.entries) {
        requireValue(
            habitIds.has(entry.habitId),
            `entry references unknown habit ${entry.habitId}`,
        );
        requireValue(
            DATE.test(entry.date),
            `entry date ${entry.date} must be YYYY-MM-DD`,
        );
        requireValue(
            entry.date <= fixture.today,
            `entry ${entry.habitId}/${entry.date} is in the future`,
        );
        requireValue(
            knownOutcomes.has(entry.outcome),
            `entry has unknown outcome ${entry.outcome}`,
        );
        requireTimestamp(
            entry.editedAt,
            `entry ${entry.habitId}/${entry.date} editedAt`,
        );
        requireValue(
            entry.deletedAt === null,
            `screenshot entry ${entry.habitId}/${entry.date} must not be deleted`,
        );
        const key = `${entry.habitId}/${entry.date}`;
        requireValue(!entryKeys.has(key), `duplicate entry ${key}`);
        entryKeys.add(key);
    }

    requireValue(
        fixture.settings && typeof fixture.settings === "object",
        "settings are required",
    );
    requireValue(
        /^https:\/\//.test(fixture.settings.syncServerUrl),
        "syncServerUrl must be an HTTPS URL",
    );
    requireTimestamp(fixture.settings.lastSyncedAt, "settings.lastSyncedAt");
    requireValue(
        fixture.settings.lastSyncedAt <= fixture.now,
        "lastSyncedAt cannot be in the future",
    );
    requireValue(UUID.test(fixture.user?.id), "user id must be a UUID");
    requireValue(
        typeof fixture.user?.email === "string" &&
            fixture.user.email.includes("@"),
        "user email is required",
    );
    requireValue(
        PAIRING_CODE.test(fixture.pairing?.code),
        "pairing code must use the six-character unambiguous alphabet",
    );
    requireValue(
        typeof fixture.pairing?.deviceName === "string" &&
            fixture.pairing.deviceName,
        "pairing device name is required",
    );
    requireTimestamp(fixture.pairing.expiresAt, "pairing.expiresAt");

    const sessionIds = new Set();
    for (const session of fixture.sessions) {
        requireValue(
            UUID.test(session.id),
            `session ${session.deviceName ?? "<unnamed>"} has an invalid id`,
        );
        requireValue(
            !sessionIds.has(session.id),
            `duplicate session id ${session.id}`,
        );
        requireTimestamp(session.createdAt, `session ${session.id} createdAt`);
        requireTimestamp(
            session.lastUsedAt,
            `session ${session.id} lastUsedAt`,
        );
        sessionIds.add(session.id);
    }
    const currentSessions = fixture.sessions.filter(
        (session) => session.isCurrentDevice,
    );
    requireValue(
        currentSessions.length === 1,
        "exactly one session must be the current device",
    );
    requireValue(
        fixture.sessions.some(
            (session) => session.deviceName === fixture.pairing.deviceName,
        ),
        "paired device must appear in sessions",
    );
}

function rosterHabit(habit) {
    return {
        id: habit.id,
        name: habit.name,
        polarity: habit.polarity,
        isPrivate: habit.isPrivate,
        createdAt: habit.createdAt,
        editedAt: habit.editedAt,
        deletedAt: habit.deletedAt,
    };
}

export function remarkableProjection(fixture, { paired = true } = {}) {
    const monthKey = fixture.today.slice(0, 7);
    const entries = fixture.entries.filter((entry) =>
        entry.date.startsWith(`${monthKey}-`),
    );
    return {
        monthKey,
        roster: {
            habits: [...fixture.habits]
                .sort((a, b) => a.position - b.position)
                .map(rosterHabit),
            tombstones: [],
        },
        month: {
            entries: entries.map((entry) => ({
                habitId: entry.habitId,
                date: entry.date,
                outcome: entry.outcome === "Success" ? "x" : "o",
                editedAt: entry.editedAt,
                deletedAt: entry.deletedAt,
            })),
        },
        settings: {
            suspendImageEnabled: fixture.settings.suspendImageEnabled,
            serverUrl: fixture.settings.syncServerUrl,
            showPrivateHabits: fixture.settings.showPrivateHabits,
            token: paired ? "readme-screenshot-fixture-token" : "",
        },
        sync: { lastSyncedAt: fixture.settings.lastSyncedAt },
    };
}

export async function writeRemarkableFixture(fixture, directory) {
    const paired = remarkableProjection(fixture, { paired: true });
    const pairing = remarkableProjection(fixture, { paired: false });
    await Promise.all([
        writeFile(
            path.join(directory, "roster.json"),
            `${JSON.stringify(paired.roster, null, 2)}\n`,
        ),
        writeFile(
            path.join(directory, `${paired.monthKey}.json`),
            `${JSON.stringify(paired.month, null, 2)}\n`,
        ),
        writeFile(
            path.join(directory, "settings.json"),
            `${JSON.stringify(paired.settings, null, 2)}\n`,
        ),
        writeFile(
            path.join(directory, "settings-pairing.json"),
            `${JSON.stringify(pairing.settings, null, 2)}\n`,
        ),
        writeFile(
            path.join(directory, "sync.json"),
            `${JSON.stringify(paired.sync, null, 2)}\n`,
        ),
    ]);
    return { monthKey: paired.monthKey };
}
