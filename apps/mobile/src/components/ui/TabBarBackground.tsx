import { useEffect } from "react";
import { I18nManager, View } from "react-native";
import Animated, {
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

interface Props {
    activeIndex: number;
    tabCount: number;
}

export function TabBarBackground({ activeIndex, tabCount }: Props) {
    const width = useSharedValue(0);
    const position = useSharedValue(Math.max(activeIndex, 0));
    const isRTL = I18nManager.isRTL;

    useEffect(() => {
        // Hidden routes have no selected tab. Keep the last position for the return trip.
        if (activeIndex < 0) return;

        position.set(
            withSpring(activeIndex, {
                stiffness: 520,
                damping: 38,
                mass: 0.8,
                overshootClamping: true,
                reduceMotion: ReduceMotion.System,
            }),
        );
    }, [activeIndex, position]);

    const highlightStyle = useAnimatedStyle(() => {
        const tabWidth = width.get() / tabCount;
        const visualIndex = isRTL
            ? tabCount - 1 - position.get()
            : position.get();

        return {
            // Match the navigator's 2px horizontal item margins. Normalized position
            // keeps the pill aligned when the bar resizes, including mid-animation.
            width: Math.max(0, tabWidth - 4),
            opacity: activeIndex >= 0 && width.get() > 0 ? 1 : 0,
            transform: [{ translateX: visualIndex * tabWidth + 2 }],
        };
    });

    return (
        <View
            className="absolute inset-0 rounded-[36px] bg-surface p-2"
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        >
            <View
                className="flex-1"
                onLayout={(event) => width.set(event.nativeEvent.layout.width)}
            >
                <Animated.View
                    className="absolute bottom-0 left-0 top-0 rounded-[28px] bg-accent-soft"
                    style={highlightStyle}
                />
            </View>
        </View>
    );
}
