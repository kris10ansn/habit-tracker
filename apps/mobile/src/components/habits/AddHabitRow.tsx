import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useCreateHabit } from "@/state/queries";
import { colors } from "@/theme/colors";

// The add-new affordance at the bottom of the habits list. New habits are Positive; flipping
// polarity is one tap on the row that appears, so asking up front would buy nothing.
export function AddHabitRow() {
    const create = useCreateHabit();
    const [name, setName] = useState("");

    const trimmed = name.trim();

    const submit = () => {
        if (!trimmed) return;

        create.mutate({ name: trimmed, polarity: "Positive" });
        setName("");
    };

    return (
        <View className="mt-1 flex-row gap-2.5">
            <TextInput
                value={name}
                onChangeText={setName}
                onSubmitEditing={submit}
                returnKeyType="done"
                placeholder="New habit…"
                placeholderTextColor={colors.ink3}
                className="flex-1 rounded-field border border-dashed border-ink-3 bg-surface px-3.5 py-3 text-[15px] text-ink"
            />
            <Pressable
                onPress={submit}
                disabled={!trimmed}
                className={`items-center justify-center rounded-field px-4 ${
                    trimmed ? "bg-accent active:opacity-80" : "bg-ink-3/30"
                }`}
            >
                <Text className="text-xl font-semibold text-white">+</Text>
            </Pressable>
        </View>
    );
}
