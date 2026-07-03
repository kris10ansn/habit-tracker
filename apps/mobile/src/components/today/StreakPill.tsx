import { Pill } from "@/components/ui/Pill";
import { useUpdateEffect } from "@/lib/useUpdateEffect";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from "react-native-reanimated";

const AnimatedPill = Animated.createAnimatedComponent(Pill);

export type StreakPillProps = { streak: number; success: boolean };

export function StreakPill({ streak, success }: StreakPillProps) {
    const grayscale = useSharedValue(success ? 0 : 100);
    const scale = useSharedValue(1);

    const style = useAnimatedStyle(() => ({
        filter: `grayscale(${grayscale.get()}%)`,
        transform: [{ scale: scale.get() }],
    }));

    useUpdateEffect(() => {
        grayscale.set(withTiming(success ? 0 : 100, TIMING));

        if (success) {
            scale.set(
                withSequence(withTiming(1.1, TIMING), withTiming(1, TIMING)),
            );
        }
    }, [success]);

    return (
        <AnimatedPill
            className={"bg-orange-200"}
            labelClassName="text-orange-900"
            label={`🔥 ${streak} days `}
            style={style}
        />
    );
}

const TIMING = { duration: 120 };
