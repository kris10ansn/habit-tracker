import { Icon } from "@/components/ui/Icon";
import { BlurTargetView, BlurView } from "expo-blur";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef } from "react";
import { AppState, Pressable, Text, useColorScheme, View } from "react-native";
import { toast } from "sonner-native";
import tailwindColors from "tailwindcss/colors";

import * as LocalAuthentication from "expo-local-authentication";
import Animated, {
    FadeOut,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PrivateHabitsGateProps = React.PropsWithChildren<{
    isUnlocked: boolean;
    onUnlockedChange: (isUnlocked: boolean) => void;
}>;

export function PrivateHabitsGate({
    children,
    isUnlocked,
    onUnlockedChange,
}: PrivateHabitsGateProps) {
    const colorScheme = useColorScheme();
    const blurTargetRef = useRef<View | null>(null);

    const authenticating = useRef(false);
    const authGeneration = useRef(0);

    useFocusEffect(
        useCallback(() => {
            const lock = () => {
                authGeneration.current += 1;
                onUnlockedChange(false);
            };
            const subscription = AppState.addEventListener(
                "change",
                (state) => {
                    // Authentication itself can make iOS inactive.
                    if (state === "background") lock();
                },
            );
            return () => {
                subscription.remove();
                lock();
            };
        }, [onUnlockedChange]),
    );

    const handlePress = useCallback(async () => {
        if (isUnlocked) {
            onUnlockedChange(false);
            return;
        }
        if (authenticating.current) return;

        authenticating.current = true;
        const generation = authGeneration.current;
        try {
            const authResult = await LocalAuthentication.authenticateAsync({
                promptMessage: "View private habits",
                promptDescription: "Authenticate to view your private habits",
                biometricsSecurityLevel: "weak",
            });
            if (generation === authGeneration.current) {
                onUnlockedChange(authResult.success);
            }
        } catch {
            toast.error("Could not authenticate. Try again.");
        } finally {
            authenticating.current = false;
        }
    }, [isUnlocked, onUnlockedChange]);

    const childrenContainerStyle = useAnimatedStyle(
        () => ({ padding: withTiming(!isUnlocked ? 16 : 0) }),
        [isUnlocked],
    );

    const pressableStyle = useAnimatedStyle(
        () => ({
            borderColor: withTiming(
                !isUnlocked
                    ? colorScheme === "dark"
                        ? tailwindColors.gray[800]
                        : tailwindColors.gray[200]
                    : "transparent",
            ),
        }),
        [isUnlocked, colorScheme],
    );

    return (
        <AnimatedPressable
            className="relative overflow-hidden rounded-3xl border"
            onPress={handlePress}
            style={pressableStyle}
            accessible={!isUnlocked}
            accessibilityRole="button"
            accessibilityLabel="View private habits"
            accessibilityHint="Authenticate to reveal private habits"
        >
            <BlurTargetView
                ref={blurTargetRef}
                pointerEvents={isUnlocked ? "auto" : "none"}
                accessibilityElementsHidden={!isUnlocked}
                importantForAccessibility={
                    isUnlocked ? "auto" : "no-hide-descendants"
                }
            >
                <Animated.View
                    style={childrenContainerStyle}
                    className="gap-3.5"
                >
                    {children}
                </Animated.View>
            </BlurTargetView>

            {!isUnlocked && (
                <Animated.View
                    className="absolute inset-0"
                    exiting={FadeOut.duration(400)}
                >
                    <BlurView
                        className="absolute inset-0 flex-col items-center justify-center gap-1 px-28"
                        blurTarget={blurTargetRef}
                        intensity={20}
                        tint={colorScheme === "dark" ? "dark" : "light"}
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
                            Tap to authenticate and view private habits
                        </Text>
                    </BlurView>
                </Animated.View>
            )}
        </AnimatedPressable>
    );
}
