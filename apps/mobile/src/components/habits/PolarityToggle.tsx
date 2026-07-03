import { Pressable, View } from "react-native";

import { cn } from "@/lib/cn";
import { useUpdateEffect } from "@/lib/useUpdateEffect";
import { colors } from "@/theme/colors";
import Animated, {
    Easing,
    interpolateColor,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withSequence,
    withSpring,
    WithSpringConfig,
    withTiming,
} from "react-native-reanimated";

interface Props {
    negative: boolean;
    onChange?: (negative: boolean) => void;
}

const SEGMENT_WIDTH = 4 * 20 - 10;

const SLIDE_SPRING: WithSpringConfig = {
    mass: 1,
    damping: 23,
    stiffness: 340,
};

// Kick the slide off the mark instantly so there's no ease-in delay on press.
const SLIDE_VELOCITY = 900;

export function PolarityToggle({ negative, onChange }: Props) {
    const slideTransformX = useSharedValue(negative ? SEGMENT_WIDTH : 0);
    const slidePadding = useSharedValue(0);

    const negativeShared = useDerivedValue(() => negative);
    const negativeProgress = useSharedValue(Number(negative));

    const slideStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateX:
                    slideTransformX.get() -
                    (negativeShared.get() ? slidePadding.get() : 0),
            },
        ],
        width: SEGMENT_WIDTH + slidePadding.get(),
    }));

    const positiveStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            negativeProgress.get(),
            [0, 1],
            ["#ffffff", colors.ink],
        ),
    }));

    const negativeStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            negativeProgress.get(),
            [0, 1],
            [colors.ink, "#ffffff"],
        ),
    }));

    useUpdateEffect(() => {
        slideTransformX.set(
            withSpring(negative ? SEGMENT_WIDTH : 0, {
                ...SLIDE_SPRING,
                velocity: negative ? SLIDE_VELOCITY : -SLIDE_VELOCITY,
            }),
        );

        slidePadding.set(
            withSequence(
                withTiming(SEGMENT_WIDTH * 0.5, {
                    duration: 70,
                    easing: Easing.out(Easing.quad),
                }),
                withTiming(0, { duration: 70, easing: Easing.in(Easing.quad) }),
            ),
        );

        negativeProgress.set(
            withTiming(Number(negative), {
                duration: 140,
                easing: Easing.out(Easing.quad),
            }),
        );
    }, [negative]);

    return (
        <Pressable
            onPress={() => onChange?.(!negative)}
            className="flex-row self-start overflow-hidden rounded-full border border-line"
        >
            <Animated.View
                className={`absolute h-full bg-accent`}
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
