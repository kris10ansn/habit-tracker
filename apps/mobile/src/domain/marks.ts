// Presentation-neutral reading of a habit's state for a day, derived from the
// shared X/O glossary. Components map `kind` to styling; they never re-derive the
// X/O semantics themselves. See the monorepo-root CONTEXT.md.
import { dateKey, type MonthGrid } from "./dates";
import type { EntryState, Habit } from "./types";

export type MarkKind = "done" | "missed" | "slip" | "clean" | "empty";

export interface MarkView {
    kind: MarkKind;
    label: string;
    // Future clean days on a negative habit: "didn't slip" hasn't happened yet.
    muted: boolean;
}

// Positive: x = done, o = missed, absent = unmarked.
// Negative: o = slipped; any other day is an (implicit) clean day.
// `kind` drives both glyph and color in the component — no UI concern here.
export const markView = (
    habit: Habit,
    key: string,
    isFuture = false,
): MarkView => {
    const entry = habit.entries[key];

    if (habit.negative) {
        if (entry === "o")
            return { kind: "slip", label: "Slipped", muted: false };
        return { kind: "clean", label: "Clean", muted: isFuture };
    }

    if (entry === "x") return { kind: "done", label: "Done", muted: false };
    if (entry === "o") return { kind: "missed", label: "Missed", muted: false };
    return { kind: "empty", label: "Not yet", muted: false };
};

// The tap cycle, mirroring the reMarkable client (HabitsStore._nextEntryState):
// positive: unmarked → x → o → unmarked; negative: clean → o → clean. `undefined`
// is the unmarked state — callers drop the key rather than storing it.
export const nextEntry = (
    habit: Habit,
    key: string,
): EntryState | undefined => {
    const entry = habit.entries[key];
    if (habit.negative) return entry === "o" ? undefined : "o";
    if (entry === undefined) return "x";
    return entry === "x" ? "o" : undefined;
};

// A day "counts" when a positive habit is done, or a negative habit didn't slip.
export const isSuccess = (habit: Habit, key: string): boolean =>
    habit.negative ? habit.entries[key] !== "o" : habit.entries[key] === "x";

// Consecutive successful days ending today (within the viewed month).
export const currentStreak = (habit: Habit, grid: MonthGrid): number => {
    let streak = 0;
    for (let day = grid.today; day >= 1; day -= 1) {
        if (!isSuccess(habit, dateKey(grid.year, grid.month, day))) break;
        streak += 1;
    }
    return streak;
};

export const priorStreak = (habit: Habit, grid: MonthGrid): number => {
    let streak = 0;
    for (let day = grid.today - 1; day >= 1; day -= 1) {
        if (!isSuccess(habit, dateKey(grid.year, grid.month, day))) break;
        streak += 1;
    }
    return streak;
};
