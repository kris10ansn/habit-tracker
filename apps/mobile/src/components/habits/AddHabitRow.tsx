import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
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
        <View className="mt-2 flex-row gap-3">
            <TextInput
                value={name}
                onChangeText={setName}
                onSubmitEditing={submit}
                returnKeyType="done"
                placeholder="New habit…"
                placeholderTextColor={colors.ink3}
                className="min-h-[48px] flex-1 rounded-field border border-line bg-surface px-4 py-3 text-[15px] text-ink focus:border-accent"
            />
            <Pressable
                onPress={submit}
                accessibilityRole="button"
                accessibilityLabel="Add habit"
                disabled={!trimmed}
                className={`items-center justify-center rounded-field px-4 ${
                    trimmed ? "bg-accent active:opacity-80" : "bg-accent-soft"
                }`}
            >
                <Icon
                    name="add"
                    size={22}
                    className={trimmed ? "text-white" : "text-accent"}
                />
            </Pressable>
        </View>
    );
}
