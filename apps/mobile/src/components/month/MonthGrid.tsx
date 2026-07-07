import { ScrollView, Text, View } from "react-native";

import { HabitMark } from "@/components/HabitMark";
import { Card } from "@/components/ui/Card";
import {
    dateKey,
    weekdayShort,
    type MonthGrid as MonthGridMeta,
} from "@/domain/dates";
import { markView } from "@/domain/marks";
import type { Habit } from "@/domain/types";
import { cn } from "@/lib/cn";

interface MonthGridProps {
    habits: Habit[];
    grid: MonthGridMeta;
    onToggle?: (habitId: string, dateKey: string) => void;
}

const DAY_COLUMN = "w-11";
const HABIT_COLUMN = "min-w-[48px] flex-1";

const columnLabel = (habit: Habit): string => {
    const words = habit.name.split(" ").filter(Boolean);
    const base =
        words.length > 1
            ? words.map((w) => w[0]).join("")
            : habit.name.slice(0, 3);
    return habit.negative ? `${base}⁻` : base;
};

export function MonthGrid({ habits, grid, onToggle }: MonthGridProps) {
    const days = Array.from({ length: grid.daysInMonth }, (_, i) => i + 1);

    return (
        <Card className="px-2 py-2">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="grow flex"
            >
                <View className="flex grow">
                    <View className="grow flex-row pb-4">
                        <View className={DAY_COLUMN} />
                        {habits.map((habit) => (
                            <View
                                key={habit.id}
                                className={cn(
                                    HABIT_COLUMN,
                                    "items-center px-0.5",
                                )}
                            >
                                <Text
                                    numberOfLines={1}
                                    className="text-[10px] font-semibold text-ink-2"
                                >
                                    {columnLabel(habit)}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {days.map((day) => (
                        <MonthDayRow
                            key={day}
                            habits={habits}
                            grid={grid}
                            day={day}
                            onToggle={onToggle}
                        />
                    ))}
                </View>
            </ScrollView>
        </Card>
    );
}

interface MonthDayRowProps {
    habits: Habit[];
    grid: MonthGridMeta;
    day: number;
    onToggle?: (habitId: string, dateKey: string) => void;
}

export function MonthDayRow({ habits, grid, day, onToggle }: MonthDayRowProps) {
    const isToday = day === grid.today;
    const isFuture = day > grid.today;

    return (
        <View
            className={cn(
                "flex-row items-center",
                isToday && "rounded-lg bg-accent-soft",
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
                    {weekdayShort(grid.year, grid.month, day)}
                </Text>
            </View>
            {habits.map((habit, habitIndex) => {
                const dayKey = dateKey(grid.year, grid.month, day);
                return (
                    <View
                        key={habit.id}
                        className={cn(HABIT_COLUMN, "items-center py-1")}
                    >
                        <HabitMark
                            view={markView(habit, dayKey, isFuture)}
                            size="sm"
                            onPress={() => onToggle?.(habit.id, dayKey)}
                        />
                    </View>
                );
            })}
        </View>
    );
}
