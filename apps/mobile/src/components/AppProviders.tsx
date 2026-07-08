import { useDatabase } from "@/db/client";
import { migrations } from "@/db/migrations";
import { seedIfEmpty } from "@/db/seed";
import { colors } from "@/theme/colors";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { SQLiteProvider, type SQLiteDatabase } from "expo-sqlite";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

// Local SQLite is the source of truth, so data only changes through our own mutations (which
// invalidate) — queries never need to refetch on their own. Visited months linger for 30 min.
const queryClient = new QueryClient({
    defaultOptions: {
        queries: { staleTime: Infinity, gcTime: 1000 * 60 * 30, retry: false },
    },
});

const enableWal = async (db: SQLiteDatabase) => {
    await db.execAsync("PRAGMA journal_mode = WAL;");
};

const BootScreen = ({ children }: { children?: string }) => (
    <View className="flex-1 items-center justify-center bg-surface px-8">
        {children ? (
            <Text className="text-center text-ink-2">{children}</Text>
        ) : (
            <ActivityIndicator color={colors.accent} />
        )}
    </View>
);

// Applies Drizzle migrations and seeds first-run data before any screen queries the database.
function DatabaseGate({ children }: { children: ReactNode }) {
    const db = useDatabase();
    const { success, error } = useMigrations(db, migrations);
    const [seeded, setSeeded] = useState(false);
    const [seedError, setSeedError] = useState<Error | null>(null);
    // Seed exactly once: guards against the effect double-firing (StrictMode / Fast Refresh),
    // which could otherwise let two seedIfEmpty runs both pass the emptiness check and double-seed.
    const seedStarted = useRef(false);

    useEffect(() => {
        if (!success || seedStarted.current) {
            return;
        }

        seedStarted.current = true;

        seedIfEmpty(db)
            .then(() => setSeeded(true))
            .catch((cause) =>
                setSeedError(
                    cause instanceof Error ? cause : new Error(String(cause)),
                ),
            );
    }, [success, db]);

    // Surface a seed failure instead of hanging on the spinner forever.
    const failure = error ?? seedError;
    if (failure) {
        return <BootScreen>{`Database error: ${failure.message}`}</BootScreen>;
    }

    if (!success || !seeded) {
        return <BootScreen />;
    }

    return <>{children}</>;
}

// Composes the app-wide providers and gates rendering on a migrated, seeded database.
export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <GestureHandlerRootView>
            <KeyboardProvider>
                <SQLiteProvider databaseName="habits.db" onInit={enableWal}>
                    <QueryClientProvider client={queryClient}>
                        <DatabaseGate>{children}</DatabaseGate>
                    </QueryClientProvider>
                </SQLiteProvider>
            </KeyboardProvider>
        </GestureHandlerRootView>
    );
}
