// The only place that speaks the database. Reads return alive rows (deleted = false); writes stamp
// an epoch-ms `updatedAt` and, for clears/deletes, leave a tombstone rather than removing the row
// (see docs/adr/0001). Drizzle's column modes make results already match the domain types, so there
// are no row mappers or casts. Screens go through the TanStack Query hooks in state/queries.ts.
import { and, asc, desc, eq, gte, lt, lte, max } from "drizzle-orm";

import {
    consecutiveEndingAt,
    daysBetween,
    monthKeyBounds,
    shiftDay,
    todayKey,
} from "@/domain/dates";
import type { HabitStreak } from "@/domain/marks";
import type { Habit, Outcome, Polarity } from "@/domain/types";

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
export function getMonthEntries(db: Database, monthKey: string) {
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
    const fromIndex = roster.findIndex((habit) => habit.id === habitId);
    if (fromIndex === -1 || fromIndex === toIndex) return;

    const reordered = [...roster];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

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
// habits count consecutive `success` days from a bounded window; negative habits count days since
// their last slip (0 if never slipped — there is no honest earlier anchor without a createdAt).
export async function getStreaks(
    db: Database,
    roster: Habit[],
    today: string = todayKey(),
): Promise<Record<string, HabitStreak>> {
    const yesterday = shiftDay(today, -1);

    const streaks = await Promise.all(
        roster.map(async (habit): Promise<[string, HabitStreak]> => {
            if (habit.polarity === "positive") {
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
            }

            const [row] = await db
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
            const current = row?.lastSlip
                ? Math.max(0, daysBetween(row.lastSlip, today))
                : 0;
            return [
                habit.id,
                { current, established: Math.max(0, current - 1) },
            ];
        }),
    );

    return Object.fromEntries(streaks);
}
