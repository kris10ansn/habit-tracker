import { Tabs } from "expo-router";

import { Toaster } from "sonner-native";

import { AppProviders } from "@/components/AppProviders";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/theme/colors";

import { PlatformPressable } from "expo-router/build/react-navigation";
import React from "react";
import { StatusBar, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import "../../global.css";

const TabBarButton = (
    props: React.ComponentProps<typeof PlatformPressable>,
) => <PlatformPressable {...props} android_ripple={{ color: null }} />;

export default function RootLayout() {
    const insets = useSafeAreaInsets();
    const { fontScale } = useWindowDimensions();

    return (
        <AppProviders>
            <StatusBar barStyle={"dark-content"} />
            <View className="flex-1 bg-surface-2">
                <Tabs
                    // Safe-area clearance belongs outside the capsule; the surrounding
                    // area stays transparent so screen content can scroll behind it.
                    safeAreaInsets={{ bottom: 0, left: 0, right: 0 }}
                    screenOptions={{
                        headerShown: false,
                        tabBarActiveTintColor: colors.accent,
                        tabBarInactiveTintColor: colors.ink2,
                        tabBarActiveBackgroundColor: colors.accentSoft,
                        tabBarLabelPosition: "below-icon",
                        tabBarHideOnKeyboard: true,
                        tabBarStyle: {
                            position: "absolute",
                            backgroundColor: colors.surface,
                            borderTopWidth: 0,
                            borderRadius: 36,
                            // Grow with accessibility text sizes while retaining generous targets.
                            height: 72 + Math.max(0, fontScale - 1) * 14,
                            bottom: Math.max(insets.bottom, 12),
                            marginLeft: Math.max(insets.left, 16),
                            marginRight: Math.max(insets.right, 16),
                            paddingTop: 8,
                            paddingBottom: 8,
                            paddingHorizontal: 8,
                            shadowColor: colors.ink,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 12,
                            elevation: 5,
                        },
                        tabBarItemStyle: {
                            borderRadius: 28,
                            overflow: "hidden",
                            marginHorizontal: 2,
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
                    {/* Reached by pushing from the Sync tab's Account card, not by tab — href: null
                    keeps them out of the tab bar while staying part of this navigator. */}
                    <Tabs.Screen name="devices" options={{ href: null }} />
                    <Tabs.Screen name="link-device" options={{ href: null }} />
                </Tabs>
            </View>

            <Toaster position="bottom-center" />
        </AppProviders>
    );
}
