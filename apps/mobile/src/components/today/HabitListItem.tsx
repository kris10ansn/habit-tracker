import { Text, View } from "react-native";

import { HabitMark } from "@/components/HabitMark";
import { StreakPill } from "@/components/today/StreakPill";
import { Pill } from "@/components/ui/Pill";
import {
    displayStreak,
    isSuccess,
    markView,
    type HabitStreak,
} from "@/domain/marks";
import type { Habit, Outcome } from "@/domain/types";
import { cn } from "@/lib/cn";

interface Props {
    habit: Habit;
    outcome: Outcome | undefined;
    streak: HabitStreak | undefined;
    onToggle?: () => void;
    isLast?: boolean;
}

export function HabitListItem({
    habit,
    outcome,
    streak,
    onToggle,
    isLast,
}: Props) {
    const view = markView(habit.polarity, outcome);
    const success = isSuccess(habit.polarity, outcome);

    const displayed = displayStreak(streak);

    return (
        <View
            className={cn(
                "mx-4 flex-row items-center gap-4 py-3",
                !isLast && "border-b border-line",
            )}
        >
            <View className="flex-1 gap-1">
                <Text
                    numberOfLines={1}
                    className="text-base font-semibold text-ink"
                >
                    {habit.name}
                </Text>
                <View className="mt-1 flex-row items-center gap-2">
                    {habit.polarity === "Negative" && <Pill label="avoid" />}

                    {displayed > 1 ? (
                        <StreakPill streak={displayed} success={success} />
                    ) : (
                        <Text className="flex-1 text-xs leading-5 text-ink-2">
                            {success ? "Tap to unmark" : "Tap to mark"}
                        </Text>
                    )}
                </View>
            </View>
            <HabitMark view={view} size="lg" onPress={onToggle} />
        </View>
    );
}
