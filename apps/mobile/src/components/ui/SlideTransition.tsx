import { useUpdateEffect } from "@/lib/useUpdateEffect";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

interface Props {
    // When this changes, the old children slide/fade out while the new ones slide in to replace them.
    transitionKey: string;
    // 1 = new content enters from the right (moving forward), -1 = from the left (moving back).
    direction: number;
    children: ReactNode;
    // Slide distance in px; defaults to the measured container width (a full-width swipe).
    distance?: number;
    // Cross-fade the two layers on top of the slide (used for the month title).
    fade?: boolean;
    durationMs?: number;
}

// Cross-slides its children whenever `transitionKey` changes: the previous render is snapshotted into
// an outgoing layer that slides (and optionally fades) out to one side while the incoming children
// slide in from the other. A single `progress` value (0 → 1) drives both layers so they stay locked.
//
// The outgoing layer is deliberately *not* unmounted when the animation settles: doing that forced a
// re-render that re-evaluated the animated styles and produced a one-frame flash. Instead it comes to
// rest fully off-screen (or at opacity 0, for a fade) and is simply replaced on the next transition —
// so nothing changes at settle. The outer View clips the off-screen travel so neither layer bleeds
// past the layout.
export function SlideTransition({
    transitionKey,
    direction,
    children,
    distance,
    fade = false,
    durationMs = 220,
}: Props) {
    const width = useSharedValue(0);
    const dir = useSharedValue(0);
    // 1 = settled (incoming at rest, no outgoing); a transition drives it 0 → 1.
    const progress = useSharedValue(1);

    // The prior render, held on-screen and animated out for the duration of a transition.
    const [outgoing, setOutgoing] = useState<{
        key: string;
        node: ReactNode;
    } | null>(null);
    const previous = useRef<{ key: string; node: ReactNode }>({
        key: transitionKey,
        node: children,
    });

    useUpdateEffect(() => {
        setOutgoing(previous.current);
        dir.set(direction);
        progress.set(0);
        progress.set(withTiming(1, { duration: durationMs }));
    }, [transitionKey, direction, durationMs, dir, progress]);

    // Runs after the transition effect above, so on a key change that effect still reads the *old*
    // snapshot before this overwrites it with the render that just committed.
    useEffect(() => {
        previous.current = { key: transitionKey, node: children };
    });

    const incomingStyle = useAnimatedStyle(() => {
        const travel = distance ?? (width.get() || 320);
        return {
            transform: [
                { translateX: dir.get() * travel * (1 - progress.get()) },
            ],
            opacity: fade ? progress.get() : 1,
        };
    });

    const outgoingStyle = useAnimatedStyle(() => {
        const travel = distance ?? (width.get() || 320);
        return {
            transform: [{ translateX: -dir.get() * travel * progress.get() }],
            opacity: fade ? 1 - progress.get() : 1,
        };
    });

    return (
        <View className="overflow-hidden">
            <Animated.View
                onLayout={(event) => {
                    width.set(event.nativeEvent.layout.width);
                }}
                style={incomingStyle}
            >
                {children}
            </Animated.View>
            {outgoing && (
                <View className="absolute inset-x-0 top-0" pointerEvents="none">
                    <Animated.View style={outgoingStyle}>
                        {outgoing.node}
                    </Animated.View>
                </View>
            )}
        </View>
    );
}
