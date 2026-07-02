import { Text, TextInput, View } from "react-native";

import { colors } from "@/theme/colors";

interface Props {
    label: string;
    value?: string;
    placeholder?: string;
    hint?: string;
}

// Labelled text input with an optional helper line. Presentational for now —
// no controlled value wiring yet.
export function TextField({ label, value, placeholder, hint }: Props) {
    return (
        <View className="mb-4">
            <Text className="mb-1.5 ml-1 text-xs font-semibold uppercase tracking-wide text-ink-3">
                {label}
            </Text>
            <TextInput
                defaultValue={value}
                placeholder={placeholder}
                placeholderTextColor={colors.ink3}
                className="rounded-field border border-line bg-surface px-3.5 py-3.5 text-[15px] text-ink"
            />
            {hint ? (
                <Text className="ml-1 mt-2 text-xs leading-5 text-ink-2">
                    {hint}
                </Text>
            ) : null}
        </View>
    );
}
