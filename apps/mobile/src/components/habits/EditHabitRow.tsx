import { Pressable, TextInput, View } from "react-native";

import { CommunityIcon, Icon } from "@/components/ui/Icon";
import type { Habit } from "@/domain/types";

import { useHabits } from "@/state/HabitsProvider";
import { PolarityToggle } from "./PolarityToggle";

interface Props {
    habit: Habit;
}

export function EditHabitRow({ habit }: Props) {
    const { updateHabit } = useHabits();

    return (
        <View className="mb-2.5 flex-row items-center gap-3 rounded-card bg-surface px-3.5 py-3 shadow-sm">
            <CommunityIcon name="drag" />

            <View className="flex-1">
                <TextInput
                    defaultValue={habit.name}
                    className="py-0.5 text-[15px] font-semibold text-ink"
                    onChangeText={(name) => updateHabit(habit, { name })}
                />
                <View className="mt-1">
                    <PolarityToggle
                        negative={habit.negative}
                        onChange={(negative) =>
                            updateHabit(habit, { negative })
                        }
                    />
                </View>
            </View>

            <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-slip-soft active:opacity-70">
                <Icon name="close" size={16} className="text-slip" />
            </Pressable>
        </View>
    );
}
