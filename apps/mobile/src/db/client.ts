import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";
import { useMemo } from "react";

import * as schema from "./schema";

// The Drizzle handle the repo speaks to — a thin, typed wrapper over the open SQLite connection.
export type Database = ExpoSQLiteDatabase<typeof schema>;

export const createDatabase = (sqlite: SQLiteDatabase): Database =>
    drizzle(sqlite, { schema });

// Memoized per the app's single open connection (stable across renders via SQLiteProvider).
export function useDatabase(): Database {
    const sqlite = useSQLiteContext();
    return useMemo(() => createDatabase(sqlite), [sqlite]);
}
