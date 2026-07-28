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
                "rounded-field border border-line bg-surface px-3.5 py-3.5 text-[15px] text-ink",
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
                "mb-1.5 ml-1 text-xs font-semibold uppercase tracking-wide text-ink-3",
                className,
            )}
        >
            {children}
        </Text>
    );
}
