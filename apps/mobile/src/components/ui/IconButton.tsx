import { Pressable } from "react-native";

import { Icon, type MaterialIconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type Size = "md" | "xs";

interface Props {
    icon: MaterialIconName;
    onPress?: () => void;
    disabled?: boolean;
    accessibilityLabel?: string;
    size?: Size;
    className?: string;
}

// Square, Material-icon tap target — month arrows, list reordering, etc.
const SIZES: Record<Size, { box: string; icon: number }> = {
    md: { box: "h-[44px] w-[44px] rounded-full", icon: 20 },
    xs: { box: "h-5 w-6 rounded-md", icon: 14 },
};

export function IconButton({
    icon,
    onPress,
    disabled,
    accessibilityLabel,
    size = "md",
    className,
}: Props) {
    const s = SIZES[size];
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={onPress}
            disabled={disabled}
            className={cn(
                "items-center justify-center bg-surface-2 active:opacity-70",
                size === "md" && "border border-line bg-surface",
                s.box,
                disabled && "opacity-40",
                className,
            )}
        >
            <Icon name={icon} size={s.icon} className="text-ink-2" />
        </Pressable>
    );
}
