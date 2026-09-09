import * as SecureStore from "expo-secure-store";

import type { AuthSession } from "@/auth/session";

import type { AppRuntime } from "./types";

const SESSION_KEY = "auth-session";

export const productionRuntime: AppRuntime = {
    databaseName: "habits.db",
    sessionStore: {
        async get() {
            const raw = await SecureStore.getItemAsync(SESSION_KEY);
            if (!raw) return null;

            try {
                return JSON.parse(raw) as AuthSession;
            } catch {
                return null;
            }
        },
        async set(session) {
            await SecureStore.setItemAsync(
                SESSION_KEY,
                JSON.stringify(session),
            );
        },
        async clear() {
            await SecureStore.deleteItemAsync(SESSION_KEY);
        },
    },
    fetch: (input, init) => globalThis.fetch(input, init),
};
