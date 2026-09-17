import { Pressable, Text } from "react-native";

import { twMerge } from "tailwind-merge";

type Props = {
    onPress?: () => void;
    disabled?: boolean;
    className?: string;
} & (
    | {
          label: string;
      }
    | { children: React.ReactNode }
);

export function Button({ onPress, disabled, className, ...props }: Props) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: Boolean(disabled) }}
            onPress={onPress}
            disabled={disabled}
            className={twMerge(
                "min-h-[48px] items-center justify-center rounded-field bg-accent px-4 py-3.5 active:opacity-80",
                disabled && "opacity-50",
                className,
            )}
        >
            {"label" in props ? (
                <ButtonText>{props.label}</ButtonText>
            ) : (
                props.children
            )}
        </Pressable>
    );
}

export function ButtonText({
    children,
    className,
    ...props
}: React.ComponentProps<typeof Text>) {
    return (
        <Text
            className={twMerge(
                "flex-row items-center justify-center text-[15px] font-semibold text-white",
                className,
            )}
        >
            {children}
        </Text>
    );
}
