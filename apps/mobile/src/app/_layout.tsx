import { Tabs } from "expo-router";

import { AppProviders } from "@/components/AppProviders";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/theme/colors";

import { PlatformPressable } from "expo-router/build/react-navigation";
import React from "react";
import { StatusBar } from "react-native";
import "../../global.css";

const TabBarButton = (
    props: React.ComponentProps<typeof PlatformPressable>,
) => <PlatformPressable {...props} android_ripple={{ color: null }} />;

export default function RootLayout() {
    return (
        <AppProviders>
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
                            <Icon name="edit" color={color} size={size} />
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
        </AppProviders>
    );
}
