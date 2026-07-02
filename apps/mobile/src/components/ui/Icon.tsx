import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { cssInterop } from "nativewind";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

// MaterialIcons is third-party, so NativeWind needs to map `className` onto its
// `style` prop — the icon renders a `Text` whose `style.color` wins over its
// default `color`, so Tailwind `text-*` utilities tint it. Registered once here.
cssInterop(MaterialIcons, { className: "style" });

// The shared icon primitive: MaterialIcons with className-driven color. Pass
// `size` as a number (icons aren't sized by text utilities) and a `text-*`
// class for the tint. Names are constrained to the Material set.
export type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

interface Props<T_Name extends string> {
    name: T_Name;
    size?: number;
    className?: string;
    // Escape hatch for callers that hand us a resolved color rather than a class
    // — chiefly the React Navigation tab bar, which computes the active tint.
    color?: ColorValue;
}

export function Icon({
    name,
    size = 20,
    className,
    color,
}: Props<MaterialIconName>) {
    return (
        <MaterialIcons
            name={name}
            size={size}
            className={className}
            color={color}
        />
    );
}

cssInterop(MaterialCommunityIcons, { className: "style" });

export type MaterialCommunityIconName = ComponentProps<
    typeof MaterialCommunityIcons
>["name"];

export function CommunityIcon({
    name,
    size = 20,
    className,
    color,
}: Props<MaterialCommunityIconName>) {
    return (
        <MaterialCommunityIcons
            name={name}
            size={size}
            className={className}
            color={color}
        />
    );
}
