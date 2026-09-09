import type { AuthSession } from "@/auth/session";
import type { SQLiteDatabase } from "expo-sqlite";

export interface SessionStore {
    get(): Promise<AuthSession | null>;
    set(session: AuthSession): Promise<void>;
    clear(): Promise<void>;
}

export interface AppRuntime {
    databaseName: string;
    prepareDatabase?: (database: SQLiteDatabase) => Promise<void>;
    sessionStore: SessionStore;
    fetch: typeof globalThis.fetch;
}
