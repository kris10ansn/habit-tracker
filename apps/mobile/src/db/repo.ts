// The only place that speaks SQL. Every read returns alive rows (deleted = 0); every write stamps
// an epoch-ms `updatedAt` and, for clears/deletes, leaves a tombstone rather than removing the row
// (see docs/adr/0001). Screens go through the TanStack Query hooks in state/queries.ts, not here.
import type { SQLiteDatabase } from "expo-sqlite";

import {
    consecutiveEndingAt,
    daysBetween,
    monthKeyBounds,
    shiftDay,
    todayKey,
} from "@/domain/dates";
import type { Entry, Habit, Outcome, Polarity } from "@/domain/types";

interface HabitRow {
    id: string;
    name: string;
    polarity: string;
    position: number;
    updatedAt: number;
    deleted: number;
}

const toHabit = (row: HabitRow): Habit => ({
    id: row.id,
    name: row.name,
    polarity: row.polarity as Polarity,
    position: row.position,
    updatedAt: row.updatedAt,
    deleted: row.deleted !== 0,
});

interface EntryRow {
    habitId: string;
    date: string;
    outcome: string;
    updatedAt: number;
    deleted: number;
}

const toEntry = (row: EntryRow): Entry => ({
    habitId: row.habitId,
    date: row.date,
    outcome: row.outcome as Outcome,
    updatedAt: row.updatedAt,
    deleted: row.deleted !== 0,
});

export async function getHabits(db: SQLiteDatabase): Promise<Habit[]> {
    const rows = await db.getAllAsync<HabitRow>(
        "SELECT id, name, polarity, position, updatedAt, deleted FROM habits WHERE deleted = 0 ORDER BY position ASC",
    );
    return rows.map(toHabit);
}

// Entries for one month partition — the unit of lazy loading, keyed like the backend's SyncMonth.
export async function getMonthEntries(
    db: SQLiteDatabase,
    monthKey: string,
): Promise<Entry[]> {
    const { start, endExclusive } = monthKeyBounds(monthKey);
    const rows = await db.getAllAsync<EntryRow>(
        "SELECT habitId, date, outcome, updatedAt, deleted FROM entries WHERE deleted = 0 AND date >= ? AND date < ?",
        start,
        endExclusive,
    );
    return rows.map(toEntry);
}

// Upsert an alive entry, resurrecting a tombstone if one exists at (habitId, date).
export async function setOutcome(
    db: SQLiteDatabase,
    habitId: string,
    date: string,
    outcome: Outcome,
    updatedAt: number = Date.now(),
): Promise<void> {
    await db.runAsync(
        `INSERT INTO entries (habitId, date, outcome, updatedAt, deleted) VALUES (?, ?, ?, ?, 0)
         ON CONFLICT(habitId, date) DO UPDATE SET outcome = excluded.outcome, updatedAt = excluded.updatedAt, deleted = 0`,
        habitId,
        date,
        outcome,
        updatedAt,
    );
}

// Clearing a cell is a soft-delete: keep the row as a tombstone whose `updatedAt` is the clear-time.
export async function clearEntry(
    db: SQLiteDatabase,
    habitId: string,
    date: string,
    updatedAt: number = Date.now(),
): Promise<void> {
    await db.runAsync(
        "UPDATE entries SET deleted = 1, updatedAt = ? WHERE habitId = ? AND date = ?",
        updatedAt,
        habitId,
        date,
    );
}

export async function updateHabit(
    db: SQLiteDatabase,
    id: string,
    patch: { name?: string; polarity?: Polarity },
    updatedAt: number = Date.now(),
): Promise<void> {
    const assignments: string[] = [];
    const args: (string | number)[] = [];
    if (patch.name !== undefined) {
        assignments.push("name = ?");
        args.push(patch.name);
    }
    if (patch.polarity !== undefined) {
        assignments.push("polarity = ?");
        args.push(patch.polarity);
    }
    if (assignments.length === 0) return;

    assignments.push("updatedAt = ?");
    args.push(updatedAt, id);
    await db.runAsync(
        `UPDATE habits SET ${assignments.join(", ")} WHERE id = ?`,
        ...args,
    );
}

// Move a habit to `toIndex` and renumber positions densely, bumping `updatedAt` only on the rows
// whose position actually changed (position is LWW per habit for sync).
export async function reorderHabit(
    db: SQLiteDatabase,
    habitId: string,
    toIndex: number,
    updatedAt: number = Date.now(),
): Promise<void> {
    const habits = await getHabits(db);
    const fromIndex = habits.findIndex((habit) => habit.id === habitId);
    if (fromIndex === -1 || fromIndex === toIndex) return;

    const reordered = [...habits];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    await db.withTransactionAsync(async () => {
        for (let position = 0; position < reordered.length; position += 1) {
            if (reordered[position].position === position) continue;
            await db.runAsync(
                "UPDATE habits SET position = ?, updatedAt = ? WHERE id = ?",
                position,
                updatedAt,
                reordered[position].id,
            );
        }
    });
}

export interface HabitStreak {
    // Consecutive successful days ending today (inclusive); 0 if today isn't (yet) a success.
    current: number;
    // The same run ending yesterday — the "established" streak, shown while today is unmarked.
    established: number;
}

// A dedicated cross-month look-back, independent of the viewed month (see docs/adr/0001). Positive
// habits count consecutive `success` days from a bounded window; negative habits count days since
// their last slip (0 if never slipped — there is no honest earlier anchor without a createdAt).
export async function getStreaks(
    db: SQLiteDatabase,
    habits: Habit[],
    today: string = todayKey(),
): Promise<Record<string, HabitStreak>> {
    const yesterday = shiftDay(today, -1);

    const streaks = await Promise.all(
        habits.map(async (habit): Promise<[string, HabitStreak]> => {
            if (habit.polarity === "positive") {
                const rows = await db.getAllAsync<{ date: string }>(
                    "SELECT date FROM entries WHERE habitId = ? AND outcome = 'success' AND deleted = 0 AND date <= ? ORDER BY date DESC LIMIT 400",
                    habit.id,
                    today,
                );
                const dates = rows.map((row) => row.date);
                return [
                    habit.id,
                    {
                        current: consecutiveEndingAt(dates, today),
                        established: consecutiveEndingAt(dates, yesterday),
                    },
                ];
            }

            const row = await db.getFirstAsync<{ lastSlip: string | null }>(
                "SELECT MAX(date) AS lastSlip FROM entries WHERE habitId = ? AND outcome = 'failure' AND deleted = 0 AND date <= ?",
                habit.id,
                today,
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
