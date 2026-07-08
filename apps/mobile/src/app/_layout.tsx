import { Tabs } from "expo-router";

import { Icon } from "@/components/ui/Icon";
import { migrate } from "@/db/schema";
import { colors } from "@/theme/colors";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlatformPressable } from "expo-router/build/react-navigation";
import { SQLiteProvider } from "expo-sqlite";
import React from "react";
import { StatusBar } from "react-native";
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

export default function RootLayout() {
    return (
        <GestureHandlerRootView>
            <SQLiteProvider databaseName="habits.db" onInit={migrate}>
                <QueryClientProvider client={queryClient}>
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
                </QueryClientProvider>
            </SQLiteProvider>
        </GestureHandlerRootView>
    );
}
