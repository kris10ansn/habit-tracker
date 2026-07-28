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
            onPress={onPress}
            disabled={disabled}
            className={twMerge(
                "items-center rounded-field bg-accent py-4 active:opacity-80",
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
