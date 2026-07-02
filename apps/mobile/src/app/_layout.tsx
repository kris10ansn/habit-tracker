import { Tabs } from "expo-router";

import { Icon } from "@/components/ui/Icon";
import { HabitsProvider } from "@/state/HabitsProvider";
import { colors } from "@/theme/colors";

import { PlatformPressable } from "expo-router/build/react-navigation";
import { StatusBar } from "react-native";
import "../../global.css";

export default function RootLayout() {
    return (
        <HabitsProvider>
            <StatusBar barStyle={"dark-content"} />
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: colors.accent,
                    tabBarInactiveTintColor: colors.ink3,
                    tabBarStyle: {
                        backgroundColor: colors.surface,
                        borderTopColor: colors.line,
                    },
                    tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
                    tabBarButton: (props) => (
                        <PlatformPressable
                            {...props}
                            android_ripple={{ color: null }}
                        />
                    ),
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
                            <Icon name="sync" color={color} size={size} />
                        ),
                    }}
                />
            </Tabs>
        </HabitsProvider>
    );
}
