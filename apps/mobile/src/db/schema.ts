import type { SQLiteDatabase } from "expo-sqlite";

import { seedDefaultData } from "./seed";

// Bump this and add a matching `if (version === N)` block for each schema change. The tables mirror
// the backend's normalized shape (see docs/adr/0001): a roster plus a (habitId, date)-keyed entry
// log, both carrying an epoch-ms `updatedAt` merge key and a `deleted` soft-delete tombstone flag.
const DATABASE_VERSION = 1;

// Passed to <SQLiteProvider onInit>, so it runs once before any screen queries the database.
export async function migrate(db: SQLiteDatabase): Promise<void> {
    const result = await db.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
    );
    let version = result?.user_version ?? 0;
    if (version >= DATABASE_VERSION) return;

    if (version === 0) {
        await db.execAsync(`
            PRAGMA journal_mode = 'wal';

            CREATE TABLE habits (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                polarity TEXT NOT NULL,
                position INTEGER NOT NULL,
                updatedAt INTEGER NOT NULL,
                deleted INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE entries (
                habitId TEXT NOT NULL,
                date TEXT NOT NULL,
                outcome TEXT NOT NULL,
                updatedAt INTEGER NOT NULL,
                deleted INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (habitId, date)
            );

            CREATE INDEX idx_entries_date ON entries (date);
        `);
        await seedDefaultData(db);
        version = 1;
    }

    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
