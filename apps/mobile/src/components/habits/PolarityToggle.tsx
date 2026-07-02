import { Pressable, View } from "react-native";

import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";
import { useEffect } from "react";
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

interface Props {
    negative: boolean;
    onChange?: (negative: boolean) => void;
}

const SEGMENT_WIDTH = 4 * 20 - 10;
const TIMING = { duration: 300 };

export function PolarityToggle({ negative, onChange }: Props) {
    const slideTransformX = useSharedValue(negative ? SEGMENT_WIDTH : 0);
    const negativeShared = useSharedValue(0);

    const slideStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: slideTransformX.get() }],
    }));

    const positiveStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            negativeShared.get(),
            [0, 1],
            ["#ffffff", colors.ink],
        ),
    }));

    const negativeStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            negativeShared.get(),
            [0, 1],
            [colors.ink, "#ffffff"],
        ),
    }));

    useEffect(() => {
        slideTransformX.set(withSpring(negative ? SEGMENT_WIDTH : 0, TIMING));
        negativeShared.set(withSpring(Number(negative), TIMING));
    }, [negative]);

    return (
        <Pressable
            onPress={() => onChange?.(!negative)}
            className="flex-row self-start overflow-hidden rounded-full border border-line"
        >
            <Animated.View
                className={`absolute h-full w-20 bg-accent`}
                style={slideStyle}
            />

            <View className={cn("w-20 flex-row justify-center px-2.5 py-1")}>
                <Animated.Text
                    className={cn("text-sm font-semibold")}
                    style={positiveStyle}
                >
                    Positive
                </Animated.Text>
            </View>
            <View className={cn("w-20 flex-row justify-center px-2.5 py-1")}>
                <Animated.Text
                    className={cn("text-sm font-semibold")}
                    style={negativeStyle}
                >
                    Negative
                </Animated.Text>
            </View>
        </Pressable>
    );
}
