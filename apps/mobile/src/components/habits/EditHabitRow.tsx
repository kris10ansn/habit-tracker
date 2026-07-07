import { Pressable, TextInput, View } from "react-native";

import { CommunityIcon } from "@/components/ui/Icon";
import type { Habit } from "@/domain/types";

import { useHabits } from "@/state/HabitsProvider";
import { PolarityToggle } from "./PolarityToggle";

interface Props {
    habit: Habit;
}

// Content of one roster row — the name, polarity, and action controls. Laid
// out by the surrounding card row in SortableHabitList.
export function EditHabitRow({ habit }: Props) {
    const { updateHabit } = useHabits();

    return (
        <>
            <View className="flex-1">
                <TextInput
                    value={habit.name}
                    className="py-0.5 text-[15px] font-semibold text-ink"
                    onChangeText={(name) => updateHabit(habit.id, { name })}
                />
                <View className="mt-1">
                    <PolarityToggle
                        negative={habit.negative}
                        onChange={(negative) =>
                            updateHabit(habit.id, { negative })
                        }
                    />
                </View>
            </View>

            <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-slip-soft active:opacity-70">
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
