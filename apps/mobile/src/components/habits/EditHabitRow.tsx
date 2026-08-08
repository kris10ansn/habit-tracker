import { useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";

import { CommunityIcon } from "@/components/ui/Icon";
import type { Habit } from "@/domain/types";
import { useDeleteHabit, useUpdateHabit } from "@/state/queries";

import { PolarityToggle } from "./PolarityToggle";

interface Props {
    habit: Habit;
}

// Content of one roster row — the name, polarity, and action controls. The name edits locally and
// commits on blur (one write per rename, not per keystroke); polarity commits on each toggle.
export function EditHabitRow({ habit }: Props) {
    const update = useUpdateHabit();
    const remove = useDeleteHabit();

    // Local draft of the name. If the stored name changes from outside this input (e.g. a future
    // sync), reconcile during render — React's prop-sync pattern — without clobbering a live edit.
    const [draft, setDraft] = useState(habit.name);
    const [lastStored, setLastStored] = useState(habit.name);
    if (habit.name !== lastStored) {
        setLastStored(habit.name);
        setDraft(habit.name);
    }

    const commitName = () => {
        const trimmed = draft.trim();
        if (!trimmed) {
            setDraft(habit.name);
            return;
        }
        if (trimmed !== habit.name)
            update.mutate({ id: habit.id, patch: { name: trimmed } });
    };

    // A delete takes the habit's whole history off every synced device, so it asks first.
    const confirmDelete = () =>
        Alert.alert(
            `Delete “${habit.name}”?`,
            "Its marks go too, on this device and every device you sync with.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => remove.mutate(habit.id),
                },
            ],
        );

    return (
        <>
            <View className="flex-1">
                <TextInput
                    value={draft}
                    className="py-0.5 text-[15px] font-semibold text-ink"
                    onChangeText={setDraft}
                    onBlur={commitName}
                    onEndEditing={commitName}
                />
                <View className="mt-1">
                    <PolarityToggle
                        negative={habit.polarity === "Negative"}
                        onChange={(negative) =>
                            update.mutate({
                                id: habit.id,
                                patch: {
                                    polarity: negative
                                        ? "Negative"
                                        : "Positive",
                                },
                            })
                        }
                    />
                </View>
            </View>

            <Pressable
                onPress={confirmDelete}
                className="h-8 w-8 items-center justify-center rounded-full bg-slip-soft active:opacity-70"
            >
                <CommunityIcon
                    name="delete-forever"
                    size={16}
                    className="text-slip"
                />
            </Pressable>
            <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-yellow-100 active:opacity-70">
                <CommunityIcon
                    name="archive-outline"
                    size={16}
                    className="text-yellow-300"
                />
            </Pressable>
        </>
    );
}
