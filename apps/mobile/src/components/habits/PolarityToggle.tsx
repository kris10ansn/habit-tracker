import { Pressable, View } from "react-native";

import { cn } from "@/lib/cn";
import { useUpdateEffect } from "@/lib/useUpdateEffect";
import { colors } from "@/theme/colors";
import Animated, {
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
    damping: 20,
    stiffness: 260,
};

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
            withSpring(negative ? SEGMENT_WIDTH : 0, SLIDE_SPRING),
        );

        slidePadding.set(
            withSequence(
                withTiming(SEGMENT_WIDTH * 0.5, { duration: 100 }),
                withTiming(0, { duration: 100 }),
            ),
        );

        negativeProgress.set(withTiming(Number(negative), { duration: 200 }));
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
