import * as Haptics from "expo-haptics";
import { createContext, memo, useContext, useRef, type ReactNode } from "react";
import { View } from "react-native";
import {
    Gesture,
    GestureDetector,
    type PanGesture,
} from "react-native-gesture-handler";
import Animated, {
    clamp,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    type SharedValue,
} from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";

import { useUpdateEffect } from "@/lib/useUpdateEffect";

const LIFTED_SCALE = 1.03;
const liftTiming = { duration: 150 };
const slideTiming = { duration: 200 };

type SlotPositions = Record<string, number>;

const slotsFor = <T,>(items: readonly T[], keyOf: (item: T) => string) =>
    Object.fromEntries(items.map((item, slot) => [keyOf(item), slot] as const));

const HandleGestureContext = createContext<PanGesture | null>(null);

interface SortableListProps<T> {
    items: readonly T[];
    keyOf: (item: T) => string;
    onReorder: (key: string, toIndex: number) => void;
    renderRow: (item: T) => ReactNode;
    rowClassName?: string;
}

// Drag-to-reorder list. Rows must be equal height; put the inter-row gap in
// `rowClassName` padding so it counts into the slot height. Rows render in
// the order items first appeared and are never re-sorted — visual order lives
// entirely in transforms — because moving native views while their transforms
// update flashes stale frames on Android.
export function SortableList<T>({
    items,
    keyOf,
    onReorder,
    renderRow,
    rowClassName,
}: SortableListProps<T>) {
    const slotHeight = useSharedValue(0);
    const positions = useSharedValue<SlotPositions>(slotsFor(items, keyOf));

    // Keyed on the key order, not the items: item edits must not rewrite the
    // map mid-drag.
    const keyOrder = items.map((item) => keyOf(item)).join();
    useUpdateEffect(() => {
        positions.set(slotsFor(items, keyOf));
    }, [keyOrder]);

    const itemsByKey = new Map(items.map((item) => [keyOf(item), item]));
    const layoutOrder = useRef<string[]>([]);
    layoutOrder.current = layoutOrder.current.filter((key) =>
        itemsByKey.has(key),
    );
    for (const key of itemsByKey.keys()) {
        if (!layoutOrder.current.includes(key)) {
            layoutOrder.current.push(key);
        }
    }

    return layoutOrder.current.map((key, layoutSlot) => (
        <SortableListRow
            key={key}
            item={itemsByKey.get(key)!}
            itemKey={key}
            layoutSlot={layoutSlot}
            lastSlot={items.length - 1}
            slotHeight={slotHeight}
            positions={positions}
            onReorder={onReorder}
            renderRow={renderRow}
            rowClassName={rowClassName}
        />
    ));
}

interface SortableListHandleProps {
    children: ReactNode;
    className?: string;
}

// The grab affordance: place inside a SortableList row around the element
// that should start a drag.
export function SortableListHandle({
    children,
    className,
}: SortableListHandleProps) {
    const gesture = useContext(HandleGestureContext);
    if (!gesture) {
        throw new Error(
            "SortableListHandle must be rendered inside a SortableList row",
        );
    }

    return (
        <GestureDetector gesture={gesture}>
            <View className={className}>{children}</View>
        </GestureDetector>
    );
}

interface SortableListRowProps<T> {
    item: T;
    itemKey: string;
    layoutSlot: number;
    lastSlot: number;
    slotHeight: SharedValue<number>;
    positions: SharedValue<SlotPositions>;
    onReorder: (key: string, toIndex: number) => void;
    renderRow: (item: T) => ReactNode;
    rowClassName?: string;
}

function SortableListRowComponent<T>({
    item,
    itemKey,
    layoutSlot,
    lastSlot,
    slotHeight,
    positions,
    onReorder,
    renderRow,
    rowClassName,
}: SortableListRowProps<T>) {
    const isGrabbed = useSharedValue(false);
    const visualSlot = useSharedValue(layoutSlot);
    const liftProgress = useSharedValue(0);

    useAnimatedReaction(
        () => positions.get()[itemKey] ?? layoutSlot,
        (slot, previousSlot) => {
            // The grabbed row follows the finger, not the map.
            if (isGrabbed.get()) return;
            if (previousSlot !== null && slot !== previousSlot) {
                visualSlot.set(withTiming(slot, slideTiming));
            }
        },
    );

    const commitReorder = (toSlot: number) => onReorder(itemKey, toSlot);
    const buzzOnLift = () =>
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const pan = Gesture.Pan()
        .onStart(() => {
            isGrabbed.set(true);
            liftProgress.set(withTiming(1, liftTiming));
            runOnJS(buzzOnLift)();
        })
        .onChange((event) => {
            const height = slotHeight.get();
            if (height === 0) return;
            visualSlot.set(visualSlot.get() + event.changeY / height);
            const targetSlot = clamp(Math.round(visualSlot.get()), 0, lastSlot);
            const currentSlot = positions.get()[itemKey] ?? layoutSlot;
            if (targetSlot === currentSlot) return;
            // Rows between the vacated and the target slot step one slot
            // toward the gap; the grabbed row takes the target.
            const step = currentSlot < targetSlot ? -1 : 1;
            const low = Math.min(currentSlot, targetSlot);
            const high = Math.max(currentSlot, targetSlot);
            positions.modify((map) => {
                for (const key in map) {
                    if (
                        key !== itemKey &&
                        map[key] >= low &&
                        map[key] <= high
                    ) {
                        map[key] += step;
                    }
                }
                map[itemKey] = targetSlot;
                return map;
            });
        })
        .onFinalize(() => {
            // Also fires for taps on the handle, where no drag ever started.
            if (!isGrabbed.get()) return;
            isGrabbed.set(false);
            liftProgress.set(withTiming(0, slideTiming));
            const targetSlot = positions.get()[itemKey] ?? layoutSlot;
            visualSlot.set(withTiming(targetSlot, slideTiming));
            runOnJS(commitReorder)(targetSlot);
        });

    const rowStyle = useAnimatedStyle(() => ({
        zIndex: isGrabbed.get() || liftProgress.get() > 0 ? 10 : 0,
        transform: [
            { translateY: (visualSlot.get() - layoutSlot) * slotHeight.get() },
            { scale: 1 + (LIFTED_SCALE - 1) * liftProgress.get() },
        ],
    }));

    return (
        <Animated.View
            style={rowStyle}
            className={rowClassName}
            onLayout={({ nativeEvent }) =>
                slotHeight.set(nativeEvent.layout.height)
            }
        >
            <HandleGestureContext.Provider value={pan}>
                {renderRow(item)}
            </HandleGestureContext.Provider>
        </Animated.View>
    );
}

const SortableListRow = memo(
    SortableListRowComponent,
) as typeof SortableListRowComponent;
