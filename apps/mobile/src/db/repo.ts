// The only place that speaks the database. Reads return alive rows (deleted = false); writes stamp
// an epoch-ms `updatedAt` and, for clears/deletes, leave a tombstone rather than removing the row
// (see docs/adr/0001). Drizzle's column modes make results already match the domain types, so there
// are no row mappers or casts. Screens go through the TanStack Query hooks in state/queries.ts.
import { and, asc, desc, eq, gte, lt, lte, max, min } from "drizzle-orm";

import {
    consecutiveEndingAt,
    dateKeyOf,
    daysBetween,
    earlierKey,
    laterKey,
    monthKeyBounds,
    shiftDay,
    todayKey,
} from "@/domain/dates";
import type { HabitStreak } from "@/domain/marks";
import { moveByIndex } from "@/domain/roster";
import type { Entry, Habit, Outcome, Polarity } from "@/domain/types";

import type { Database } from "./client";
import { entries, habits } from "./schema";

export function getHabits(db: Database): Promise<Habit[]> {
    return db
        .select()
        .from(habits)
        .where(eq(habits.deleted, false))
        .orderBy(asc(habits.position));
}

// Entries for one month partition — the unit of lazy loading, keyed like the backend's SyncMonth.
export function getMonthEntries(
    db: Database,
    monthKey: string,
): Promise<Entry[]> {
    const { start, endExclusive } = monthKeyBounds(monthKey);
    return db
        .select()
        .from(entries)
        .where(
            and(
                eq(entries.deleted, false),
                gte(entries.date, start),
                lt(entries.date, endExclusive),
            ),
        );
}

// Upsert an alive entry, resurrecting a tombstone if one exists at (habitId, date).
export async function setOutcome(
    db: Database,
    habitId: string,
    date: string,
    outcome: Outcome,
    updatedAt: number = Date.now(),
): Promise<void> {
    await db
        .insert(entries)
        .values({ habitId, date, outcome, updatedAt, deleted: false })
        .onConflictDoUpdate({
            target: [entries.habitId, entries.date],
            set: { outcome, updatedAt, deleted: false },
        });
}

// Clearing a cell is a soft-delete: keep the row as a tombstone whose `updatedAt` is the clear-time.
export async function clearEntry(
    db: Database,
    habitId: string,
    date: string,
    updatedAt: number = Date.now(),
): Promise<void> {
    await db
        .update(entries)
        .set({ deleted: true, updatedAt })
        .where(and(eq(entries.habitId, habitId), eq(entries.date, date)));
}

export async function updateHabit(
    db: Database,
    id: string,
    patch: { name?: string; polarity?: Polarity },
    updatedAt: number = Date.now(),
): Promise<void> {
    if (patch.name === undefined && patch.polarity === undefined) return;
    await db
        .update(habits)
        .set({ ...patch, updatedAt })
        .where(eq(habits.id, id));
}

// Move a habit to `toIndex` and renumber positions densely, bumping `updatedAt` only on the rows
// whose position actually changed (position is LWW per habit for sync).
export async function reorderHabit(
    db: Database,
    habitId: string,
    toIndex: number,
    updatedAt: number = Date.now(),
): Promise<void> {
    const roster = await getHabits(db);
    const reordered = moveByIndex(roster, habitId, toIndex);
    if (reordered === roster) return; // habit absent or already at toIndex — nothing to renumber

    await db.transaction(async (tx) => {
        for (let position = 0; position < reordered.length; position += 1) {
            if (reordered[position].position === position) continue;
            await tx
                .update(habits)
                .set({ position, updatedAt })
                .where(eq(habits.id, reordered[position].id));
        }
    });
}

// A dedicated cross-month look-back, independent of the viewed month (see docs/adr/0001). Positive
// habits count consecutive `success` days from a bounded window. Negative habits count the clean run
// ending today: it starts the day after the last slip, or — with no slip — at the habit's anchor.
// The anchor is `createdAt`, pulled back to the earliest recorded entry when data proves the habit
// predates it (an entry can't occur before the habit existed, so it's the more honest origin; the
// pull-back can only lengthen a run, never break it).
export async function getStreaks(
    db: Database,
    roster: Habit[],
    today: string = todayKey(),
): Promise<Record<string, HabitStreak>> {
    const streaks = await Promise.all(
        roster.map(async (habit): Promise<[string, HabitStreak]> => {
            if (habit.polarity === "positive") {
                return getStreaksPositive(db, habit, today);
            }

            return getStreaksNegative(db, habit, today);
        }),
    );

    return Object.fromEntries(streaks);
}

const getStreaksPositive = async (
    db: Database,
    habit: Habit,
    today: string,
): Promise<[string, HabitStreak]> => {
    const yesterday = shiftDay(today, -1);

    const rows = await db
        .select({ date: entries.date })
        .from(entries)
        .where(
            and(
                eq(entries.habitId, habit.id),
                eq(entries.outcome, "success"),
                eq(entries.deleted, false),
                lte(entries.date, today),
            ),
        )
        .orderBy(desc(entries.date))
        .limit(400);
    const dates = rows.map((row) => row.date);

    return [
        habit.id,
        {
            current: consecutiveEndingAt(dates, today),
            established: consecutiveEndingAt(dates, yesterday),
        },
    ];
};

const getStreaksNegative = async (
    db: Database,
    habit: Habit,
    today: string,
): Promise<[string, HabitStreak]> => {
    const [{ earliest: earliestEntryDate }] = await db
        .select({ earliest: min(entries.date) })
        .from(entries)
        .where(
            and(
                eq(entries.habitId, habit.id),
                eq(entries.deleted, false),
                lte(entries.date, today),
            ),
        );

    const [{ lastSlip: lastSlipDate }] = await db
        .select({ lastSlip: max(entries.date) })
        .from(entries)
        .where(
            and(
                eq(entries.habitId, habit.id),
                eq(entries.outcome, "failure"),
                eq(entries.deleted, false),
                lte(entries.date, today),
            ),
        );

    const habitCreationDate = dateKeyOf(new Date(habit.createdAt));

    // Anchor: the creation day, pulled back to the earliest recorded entry when the data predates
    // it (proof the habit is older than its createdAt).
    const habitStartDate = earliestEntryDate
        ? earlierKey(earliestEntryDate, habitCreationDate)
        : habitCreationDate;

    // The current clean run begins the day after the last slip, but never before the anchor.
    const streakStartDate = lastSlipDate
        ? laterKey(shiftDay(lastSlipDate, 1), habitStartDate)
        : habitStartDate;

    // +1 counts today inclusively, matching the positive branch (a first clean day reads "1 day").
    const current = Math.max(0, daysBetween(streakStartDate, today) + 1);
    const established = Math.max(0, current - 1);

    return [habit.id, { current, established }];
};
