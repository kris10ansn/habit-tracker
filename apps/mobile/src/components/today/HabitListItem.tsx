import { Text, View } from "react-native";

import { HabitMark } from "@/components/HabitMark";
import { StreakPill } from "@/components/today/StreakPill";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import type { HabitStreak } from "@/db/repo";
import { isSuccess, markView } from "@/domain/marks";
import type { Habit, Outcome } from "@/domain/types";

interface Props {
    habit: Habit;
    outcome: Outcome | undefined;
    streak: HabitStreak | undefined;
    onToggle?: () => void;
}

export function HabitListItem({ habit, outcome, streak, onToggle }: Props) {
    const view = markView(habit.polarity, outcome);
    const success = isSuccess(habit.polarity, outcome);

    // While today is unmarked, still show the run through yesterday ("keep your streak"),
    // greyed by the pill; once marked, `current` includes today.
    const displayed = Math.max(streak?.current ?? 0, streak?.established ?? 0);

    return (
        <Card className="mb-3 flex-row items-center gap-3.5">
            <View className="flex-1 gap-1">
                <Text
                    numberOfLines={1}
                    className="text-base font-semibold text-ink"
                >
                    {habit.name}
                </Text>
                <View className="mt-1 h-6 flex-row items-center gap-1.5">
                    {habit.polarity === "negative" && <Pill label="avoid" />}

                    {displayed > 1 ? (
                        <StreakPill streak={displayed} success={success} />
                    ) : (
                        <Text>Tap to {success ? "unmark" : "mark"}</Text>
                    )}
                </View>
            </View>
            <HabitMark view={view} size="lg" onPress={onToggle} />
        </Card>
    );
}
