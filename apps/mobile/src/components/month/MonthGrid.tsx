import { memo, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

import { HabitMark } from "@/components/HabitMark";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { dateKey, weekdayShort, type MonthView } from "@/domain/dates";
import { entryIndex, outcomeAt, type EntryIndex } from "@/domain/entries";
import { displayStreak, markView, type HabitStreak } from "@/domain/marks";
import type { Entry, Habit, Outcome } from "@/domain/types";
import { cn } from "@/lib/cn";
import type { ToggleFn } from "@/state/queries";

interface MonthGridProps {
    habits: Habit[];
    view: MonthView;
    today: string;
    entries: Entry[];
    streaks: Record<string, HabitStreak>;
    onToggle?: ToggleFn;
}

const DAY_COLUMN = "w-11";
const HABIT_COLUMN = "min-w-[48px] flex-1";

const columnLabel = (habit: Habit): string => {
    const words = habit.name.split(" ").filter(Boolean);
    const base =
        words.length > 1
            ? words.map((word) => word[0]).join("")
            : habit.name.slice(0, 3);
    return habit.polarity === "Negative" ? `${base}⁻` : base;
};

export const MonthGrid = memo(function MonthGrid({
    habits,
    view,
    today,
    entries,
    streaks,
    onToggle,
}: MonthGridProps) {
    const days = Array.from({ length: view.daysInMonth }, (_, i) => i + 1);
    const index = useMemo(() => entryIndex(entries), [entries]);

    return (
        <Card className="px-2 py-3">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="grow flex"
            >
                <View className="flex grow">
                    <View className="mb-2 grow flex-row items-center border-b border-line pb-3">
                        <View className={cn(DAY_COLUMN, "items-center")}>
                            <Text className="text-[9px] font-medium uppercase tracking-wide text-ink-3">
                                Day
                            </Text>
                        </View>
                        {habits.map((habit) => (
                            <View
                                key={habit.id}
                                className={cn(
                                    HABIT_COLUMN,
                                    "flex-row items-center justify-center gap-0.5 px-0.5",
                                )}
                            >
                                <Text
                                    numberOfLines={1}
                                    className="text-[10px] font-semibold text-ink-2"
                                >
                                    {columnLabel(habit)}
                                </Text>
                                {displayStreak(streaks[habit.id]) > 1 ? (
                                    <Icon
                                        name="local-fire-department"
                                        size={11}
                                        className={
                                            streaks[habit.id]?.current
                                                ? "text-warm"
                                                : "text-ink-3"
                                        }
                                    />
                                ) : null}
                            </View>
                        ))}
                    </View>

                    {days.map((day) => (
                        <MonthDayRow
                            key={day}
                            habits={habits}
                            view={view}
                            today={today}
                            day={day}
                            index={index}
                            onToggle={onToggle}
                        />
                    ))}
                </View>
            </ScrollView>
        </Card>
    );
});

interface MonthDayRowProps {
    habits: Habit[];
    view: MonthView;
    today: string;
    day: number;
    index: EntryIndex;
    onToggle?: ToggleFn;
}

export const MonthDayRow = memo(function MonthDayRow({
    habits,
    view,
    today,
    day,
    index,
    onToggle,
}: MonthDayRowProps) {
    const dayKey = dateKey(view.year, view.month, day);
    // Date keys sort lexicographically, so plain string comparison orders the calendar.
    const isToday = dayKey === today;
    const isFuture = dayKey > today;

    return (
        <View
            className={cn(
                "flex-row items-center border-b border-line/40",
                isToday && "rounded-field border-transparent bg-accent-soft",
            )}
        >
            <View className={cn(DAY_COLUMN, "items-center py-1")}>
                <Text
                    className={cn(
                        "text-xs",
                        isToday ? "font-bold text-accent" : "text-ink-2",
                    )}
                >
                    {day}
                </Text>
                <Text className="text-[9px] text-ink-3">
                    {weekdayShort(view.year, view.month, day)}
                </Text>
            </View>
            {habits.map((habit) => {
                const outcome = outcomeAt(index, habit.id, dayKey);

                return (
                    <MonthDayBox
                        key={habit.id}
                        habit={habit}
                        dayKey={dayKey}
                        outcome={outcome}
                        onToggle={onToggle}
                        isFuture={isFuture}
                    />
                );
            })}
        </View>
    );
});

type MonthDayBoxProps = {
    habit: Habit;
    dayKey: string;
    outcome: Outcome | undefined;
    onToggle?: ToggleFn;
    isFuture: boolean;
};

export const MonthDayBox = memo(function MonthDayBox({
    habit,
    dayKey,
    outcome,
    onToggle,
    isFuture,
}: MonthDayBoxProps) {
    return (
        <View className={cn(HABIT_COLUMN, "items-center py-1")}>
            <HabitMark
                view={markView(habit.polarity, outcome, isFuture)}
                size="sm"
                onPress={() => onToggle?.(habit.id, dayKey, habit.polarity)}
            />
        </View>
    );
});
