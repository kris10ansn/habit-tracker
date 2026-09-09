import type { SQLiteDatabase } from "expo-sqlite";

import { screenshotFixture } from "./fixture.generated";

// Destructive only inside the dedicated habits-readme-screenshots.db selected by screenshot mode.
// Every launch starts from the same rows, so captures cannot inherit state from a previous run.
export async function seedScreenshotDatabase(
    sqlite: SQLiteDatabase,
): Promise<void> {
    await sqlite.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.execAsync(
            "DELETE FROM entries; DELETE FROM habits; DELETE FROM settings;",
        );

        for (const habit of screenshotFixture.habits) {
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

        for (const entry of screenshotFixture.entries) {
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
            screenshotFixture.settings.syncServerUrl,
            screenshotFixture.settings.lastSyncedAt,
            screenshotFixture.now,
        );
    });
}
