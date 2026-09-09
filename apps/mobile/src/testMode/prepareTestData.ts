import type { SQLiteDatabase } from "expo-sqlite";

import { setAuthSession } from "@/auth/session";

import { testFixture } from "./fixture.generated";

// Expo Go uses a separate project identity for this target; standalone builds use a separate
// native application identity. In either case, SQLite and SecureStore are isolated from the
// ordinary app. Resetting them on launch keeps manual QA deterministic.
export async function prepareTestData(sqlite: SQLiteDatabase): Promise<void> {
    await sqlite.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.execAsync(
            "DELETE FROM entries; DELETE FROM habits; DELETE FROM settings;",
        );

        for (const habit of testFixture.habits) {
            await transaction.runAsync(
                `INSERT INTO habits
                    (id, name, polarity, position, isPrivate, createdAt, editedAt, deletedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                habit.id,
                habit.name,
                habit.polarity,
                habit.position,
                habit.isPrivate ? 1 : 0,
                habit.createdAt,
                habit.editedAt,
                habit.deletedAt,
            );
        }

        for (const entry of testFixture.entries) {
            await transaction.runAsync(
                `INSERT INTO entries
                    (habitId, date, outcome, editedAt, deletedAt)
                 VALUES (?, ?, ?, ?, ?)`,
                entry.habitId,
                entry.date,
                entry.outcome,
                entry.editedAt,
                entry.deletedAt,
            );
        }

        await transaction.runAsync(
            `INSERT INTO settings (id, syncServerUrl, lastSyncedAt, updatedAt)
             VALUES (0, ?, ?, ?)`,
            testFixture.settings.syncServerUrl,
            testFixture.settings.lastSyncedAt,
            testFixture.now,
        );
    });

    await setAuthSession({
        token: "local-test-mode-token",
        user: testFixture.user,
    });
}
