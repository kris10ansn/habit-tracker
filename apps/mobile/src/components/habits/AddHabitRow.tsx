import { Pressable, Text, TextInput, View } from "react-native";

import { colors } from "@/theme/colors";

// The add-new affordance at the bottom of the habits list.
export function AddHabitRow() {
    return (
        <View className="mt-1 flex-row gap-2.5">
            <TextInput
                placeholder="New habit…"
                placeholderTextColor={colors.ink3}
                className="flex-1 rounded-field border border-dashed border-ink-3 bg-surface px-3.5 py-3 text-[15px] text-ink"
            />
            <Pressable className="items-center justify-center rounded-field bg-accent px-4 active:opacity-80">
                <Text className="text-xl font-semibold text-white">+</Text>
            </Pressable>
        </View>
    );
}
