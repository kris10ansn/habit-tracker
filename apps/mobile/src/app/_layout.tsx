import { Tabs } from "expo-router";

import { Icon } from "@/components/ui/Icon";
import { useDatabase } from "@/db/client";
import { migrations } from "@/db/migrations";
import { seedIfEmpty } from "@/db/seed";
import { colors } from "@/theme/colors";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { PlatformPressable } from "expo-router/build/react-navigation";
import { SQLiteProvider, type SQLiteDatabase } from "expo-sqlite";
import React, { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StatusBar, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../../global.css";

const TabBarButton = (
    props: React.ComponentProps<typeof PlatformPressable>,
) => <PlatformPressable {...props} android_ripple={{ color: null }} />;

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

// Applies Drizzle migrations and seeds first-run data before any screen queries the database.
function DatabaseGate({ children }: { children: ReactNode }) {
    const db = useDatabase();
    const { success, error } = useMigrations(db, migrations);
    const [seeded, setSeeded] = useState(false);

    useEffect(() => {
        if (success) seedIfEmpty(db).then(() => setSeeded(true));
    }, [success, db]);

    if (error)
        return <BootScreen>{`Database error: ${error.message}`}</BootScreen>;
    if (!success || !seeded) return <BootScreen />;
    return <>{children}</>;
}

const BootScreen = ({ children }: { children?: string }) => (
    <View className="flex-1 items-center justify-center bg-surface px-8">
        {children ? (
            <Text className="text-center text-ink-2">{children}</Text>
        ) : (
            <ActivityIndicator color={colors.accent} />
        )}
    </View>
);

export default function RootLayout() {
    return (
        <GestureHandlerRootView>
            <SQLiteProvider databaseName="habits.db" onInit={enableWal}>
                <QueryClientProvider client={queryClient}>
                    <DatabaseGate>
                        <StatusBar barStyle={"dark-content"} />
                        <Tabs
                            screenOptions={{
                                headerShown: false,
                                tabBarActiveTintColor: colors.accent,
                                tabBarInactiveTintColor: colors.ink3,
                                tabBarStyle: {
                                    backgroundColor: colors.surface,
                                    borderTopWidth: 0,
                                    elevation: 2,
                                },
                                tabBarLabelStyle: {
                                    fontSize: 11,
                                    fontWeight: "600",
                                },
                                tabBarButton: TabBarButton,
                            }}
                        >
                            <Tabs.Screen
                                name="index"
                                options={{
                                    title: "Today",
                                    tabBarIcon: ({ color, size }) => (
                                        <Icon
                                            name="check-circle"
                                            color={color}
                                            size={size}
                                        />
                                    ),
                                }}
                            />
                            <Tabs.Screen
                                name="month"
                                options={{
                                    title: "Month",
                                    tabBarIcon: ({ color, size }) => (
                                        <Icon
                                            name="calendar-month"
                                            color={color}
                                            size={size}
                                        />
                                    ),
                                }}
                            />
                            <Tabs.Screen
                                name="habits"
                                options={{
                                    title: "Habits",
                                    tabBarIcon: ({ color, size }) => (
                                        <Icon
                                            name="edit"
                                            color={color}
                                            size={size}
                                        />
                                    ),
                                }}
                            />
                            <Tabs.Screen
                                name="sync"
                                options={{
                                    title: "Sync",
                                    tabBarIcon: ({ color, size }) => (
                                        <Icon
                                            name="cloud-queue"
                                            color={color}
                                            size={size}
                                        />
                                    ),
                                }}
                            />
                        </Tabs>
                    </DatabaseGate>
                </QueryClientProvider>
            </SQLiteProvider>
        </GestureHandlerRootView>
    );
}
