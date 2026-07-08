// A per-month lookup so the grid and Today list read a cell's Outcome in O(1) without scanning
// the month's entry rows. Built once per render from a `useMonthEntries` result.
import type { Entry, Outcome } from "./types";

export type EntryIndex = Map<string, Outcome>;

const cellKey = (habitId: string, date: string): string => `${habitId}|${date}`;

export const entryIndex = (entries: Entry[]): EntryIndex => {
    const index: EntryIndex = new Map();
    for (const entry of entries)
        index.set(cellKey(entry.habitId, entry.date), entry.outcome);
    return index;
};

export const outcomeAt = (
    index: EntryIndex,
    habitId: string,
    date: string,
): Outcome | undefined => index.get(cellKey(habitId, date));
