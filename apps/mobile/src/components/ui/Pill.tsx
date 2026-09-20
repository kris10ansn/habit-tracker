import { Text, View, ViewStyle } from "react-native";

import { cn } from "@/lib/cn";
import { Icon, type MaterialIconName } from "./Icon";

type PillProps = {
    className?: string;
    style?: ViewStyle;
    label: string;
    icon?: MaterialIconName;
    labelClassName?: string;
};

export function Pill({ className, ...props }: PillProps) {
    return (
        <View
            className={cn(
                "flex-row items-center gap-1 self-start rounded-full bg-accent-soft px-2.5 py-1",
                "children" in props && "flex-row",
                className,
            )}
            style={props.style}
        >
            {props.icon ? (
                <Icon
                    name={props.icon}
                    size={13}
                    className={props.labelClassName ?? "text-accent"}
                />
            ) : null}
            <Text
                className={cn(
                    "text-[11px] font-semibold text-accent",
                    props.labelClassName,
                )}
            >
                {props.label}
            </Text>
        </View>
    );
}
