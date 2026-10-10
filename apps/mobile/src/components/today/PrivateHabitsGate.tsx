import { Icon } from "@/components/ui/Icon";
import { BlurTargetView, BlurView } from "expo-blur";
import React, { useCallback, useRef, useState } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";
import tailwindColors from "tailwindcss/colors";

import * as LocalAuthentication from "expo-local-authentication";
import Animated, {
    FadeOut,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PrivateHabitsGateProps = {} & React.PropsWithChildren;

export default function PrivateHabitsGate({
    children,
}: PrivateHabitsGateProps) {
    const colorScheme = useColorScheme();
    const blurTargetRef = useRef<View | null>(null);

    const [isAuthed, setIsAuthed] = useState(false);

    const handlePress = useCallback(async () => {
        if (isAuthed) {
            setIsAuthed(false);
            return;
        }
        const authResult = await LocalAuthentication.authenticateAsync({
            promptMessage: "View private habits",
            promptDescription: "Authenticate to view your private habits",
            biometricsSecurityLevel: "weak",
        });

        setIsAuthed(authResult.success);
    }, [isAuthed]);

    const childrenContainerStyle = useAnimatedStyle(
        () => ({ padding: withTiming(!isAuthed ? 16 : 0) }),
        [isAuthed],
    );

    const pressableStyle = useAnimatedStyle(
        () => ({
            borderColor: withTiming(
                !isAuthed
                    ? colorScheme === "dark"
                        ? tailwindColors.gray[800]
                        : tailwindColors.gray[200]
                    : "transparent",
            ),
        }),
        [isAuthed],
    );

    return (
        <AnimatedPressable
            className="relative overflow-hidden rounded-3xl border"
            onPress={handlePress}
            style={pressableStyle}
        >
            <BlurTargetView ref={blurTargetRef}>
                <Animated.View
                    style={childrenContainerStyle}
                    className="gap-3.5"
                >
                    {children}
                </Animated.View>
            </BlurTargetView>

            {!isAuthed && (
                <Animated.View
                    className="absolute inset-0"
                    exiting={FadeOut.duration(400)}
                >
                    <BlurView
                        className="absolute inset-0 flex-col items-center justify-center gap-1 px-28"
                        blurTarget={blurTargetRef}
                        intensity={20}
                        tint={colorScheme == "dark" ? "dark" : "light"}
                        blurMethod="dimezisBlurView"
                    >
                        <Icon
                            name="lock-outline"
                            className="text-gray-500 dark:text-gray-400"
                            size={48}
                        />

                        <Text className="text-center text-lg font-semibold text-gray-500 dark:text-gray-400">
                            Private Habits
                        </Text>

                        <Text className="text-center text-gray-500 dark:text-gray-400">
                            Click to authenticate and view private habits
                        </Text>
                    </BlurView>
                </Animated.View>
            )}
        </AnimatedPressable>
    );
}
