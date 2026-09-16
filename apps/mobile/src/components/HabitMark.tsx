import { Pressable } from "react-native";

import { Icon, type MaterialIconName } from "@/components/ui/Icon";
import type { MarkKind, MarkView } from "@/domain/marks";
import { cn } from "@/lib/cn";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from "react-native-reanimated";

type Size = "lg" | "sm";

interface Props {
    view: MarkView;
    size?: Size;
    // When set, the mark becomes a tap target that cycles the day's X/O state.
    onPress?: () => void;
    // A non-interactive mark (e.g. a future day): no press, no pop animation, no active state.
    disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// `lg` (Today) tiles pop on tap via a Reanimated shared value. The `sm` grid variant deliberately
// does *not*: the Month grid renders one mark per day×habit (dozens per screen, two full grids
// mounted at once during a navigation transition), and a shared value + animated node per cell made
// building the grid the JS-thread bottleneck when paging months. So `sm` is a plain Pressable and
// the two paths are separate components — the animation hooks only ever run for the handful of `lg`
// tiles.
export function HabitMark(props: Props) {
    return props.size === "sm" ? (
        <PlainMark {...props} />
    ) : (
        <PoppingMark {...props} />
    );
}

function PoppingMark({ view, onPress, disabled }: Props) {
    const scale = useSharedValue(1);
    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.get() }],
    }));
    const interactive = Boolean(onPress) && !disabled;

    const handlePress = () => {
        scale.set(
            withSequence(
                withTiming(0.9, POP_TIMING_IN),
                withTiming(1, POP_TIMING_OUT),
            ),
        );
        onPress?.();
    };

    return (
        <AnimatedPressable
            style={style}
            onPress={handlePress}
            disabled={!interactive}
            accessibilityRole="button"
            accessibilityLabel={view.label}
            className={markClassName(view, false, interactive)}
        >
            <MarkGlyph view={view} small={false} />
        </AnimatedPressable>
    );
}

function PlainMark({ view, onPress, disabled }: Props) {
    const interactive = Boolean(onPress) && !disabled;

    return (
        <Pressable
            onPress={onPress}
            disabled={!interactive}
            accessibilityRole="button"
            accessibilityLabel={view.label}
            className={markClassName(view, true, interactive)}
        >
            <MarkGlyph view={view} small={true} />
        </Pressable>
    );
}

const markClassName = (view: MarkView, small: boolean, interactive: boolean) =>
    cn(
        "items-center justify-center",
        small ? "h-10 w-10 rounded-lg" : "h-14 w-14 rounded-2xl border",
        small ? SM_CONTAINER[view.kind] : CONTAINER[view.kind],
        !small && view.muted && "opacity-40",
        interactive && "active:opacity-60",
    );

function MarkGlyph({ view, small }: { view: MarkView; small: boolean }) {
    return (
        <Icon
            name={ICON[view.kind]}
            size={small ? 18 : view.kind === "empty" ? 22 : 28}
            className={cn(
                GLYPH[view.kind],
                small && view.muted && "opacity-40",
            )}
        />
    );
}

const POP_TIMING_IN = { duration: 100 };
const POP_TIMING_OUT = { duration: 60 };
// Container + glyph colors per state. `lg` (Today) is a bordered tile; `sm`
// (month grid) is a compact filled chip.
const CONTAINER: Record<MarkKind, string> = {
    done: "bg-done-soft border-done",
    missed: "bg-slip-soft border-slip",
    slip: "bg-slip-soft border-slip",
    clean: "bg-surface border-done",
    empty: "bg-surface-2 border-line",
};

const GLYPH: Record<MarkKind, string> = {
    done: "text-done",
    missed: "text-slip",
    slip: "text-slip",
    clean: "text-done",
    empty: "text-ink-3",
};

// Material icon per state — reads the shared X/O semantics via `kind`.
const ICON: Record<MarkKind, MaterialIconName> = {
    done: "check",
    missed: "close",
    slip: "close",
    clean: "check",
    empty: "remove",
};

// `sm` drops the border and softens the neutral states so the grid reads as
// marks-on-paper rather than a wall of boxes.
const SM_CONTAINER: Record<MarkKind, string> = {
    done: "bg-done-soft",
    missed: "bg-slip-soft",
    slip: "bg-slip-soft",
    clean: "bg-transparent",
    empty: "bg-transparent",
};
