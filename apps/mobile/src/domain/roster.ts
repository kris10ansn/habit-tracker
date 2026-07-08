// Roster ordering helpers, shared so the move has one definition.
import type { Habit } from "./types";

// Move the habit with `habitId` to `toIndex`, returning a new array (or the same reference,
// unchanged, when the habit is absent or already at `toIndex`). Used by both the optimistic
// reorder (state/queries) and the persisted reindex (db/repo.reorderHabit).
export const moveByIndex = (
    habits: Habit[],
    habitId: string,
    toIndex: number,
): Habit[] => {
    const fromIndex = habits.findIndex((habit) => habit.id === habitId);
    if (fromIndex === -1 || fromIndex === toIndex) return habits;
    const next = [...habits];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
};
