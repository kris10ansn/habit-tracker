import { Text, TextInput, View } from "react-native";

import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";

type Props = {
    label: string;
    hint?: string;
} & React.ComponentProps<typeof TextInput>;

// Labelled text input with an optional helper line. Presentational for now —
// no controlled value wiring yet.
export function TextField({ className, label, hint, ...props }: Props) {
    return (
        <View className={cn("mb-4", className)}>
            <TextInputLabel>{label}</TextInputLabel>
            <TextInputField {...props} />
            {hint ? <TextInputHint>{hint}</TextInputHint> : null}
        </View>
    );
}

export function TextInputField({
    className,
    ...props
}: React.ComponentProps<typeof TextInput>) {
    return (
        <TextInput
            placeholderTextColor={colors.ink3}
            className={cn(
                "min-h-[48px] rounded-field border border-line bg-surface-2 px-4 py-3.5 text-[15px] text-ink focus:border-accent",
                className,
            )}
            {...props}
        />
    );
}

export function TextInputHint({
    children,
    className,
    ...props
}: React.ComponentProps<typeof Text>) {
    return (
        <Text
            className={cn("ml-1 mt-2 text-xs leading-5 text-ink-2", className)}
        >
            {children}
        </Text>
    );
}

export function TextInputLabel({
    children,
    className,
    ...props
}: React.ComponentProps<typeof Text>) {
    return (
        <Text
            className={cn(
                "mb-2 ml-1 text-[11px] font-semibold tracking-wide text-ink-2",
                className,
            )}
        >
            {children}
        </Text>
    );
}
