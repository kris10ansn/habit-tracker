import { Pressable } from "react-native";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type Size = "md" | "xs";

interface Props {
    icon: IconName;
    onPress?: () => void;
    disabled?: boolean;
    size?: Size;
    className?: string;
}

// Square, Material-icon tap target — month arrows, list reordering, etc.
const SIZES: Record<Size, { box: string; icon: number }> = {
    md: { box: "h-9 w-9 rounded-field", icon: 20 },
    xs: { box: "h-5 w-6 rounded-md", icon: 14 },
};

export function IconButton({
    icon,
    onPress,
    disabled,
    size = "md",
    className,
}: Props) {
    const s = SIZES[size];
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            className={cn(
                "items-center justify-center bg-surface-2 active:opacity-70",
                size === "md" && "bg-surface shadow-sm",
                s.box,
                disabled && "opacity-40",
                className,
            )}
        >
            <Icon name={icon} size={s.icon} className="text-ink-2" />
        </Pressable>
    );
}
