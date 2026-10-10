import type { Habit } from "./types";

export function todayHabits(habits: Habit[], privateHabitsUnlocked: boolean) {
    const publicHabits = habits.filter((habit) => !habit.isPrivate);
    const privateHabits = habits.filter((habit) => habit.isPrivate);

    return {
        publicHabits,
        privateHabits,
        summaryHabits: privateHabitsUnlocked ? habits : publicHabits,
    };
}
