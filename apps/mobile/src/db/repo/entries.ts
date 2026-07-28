import { and, eq, gte, lt } from "drizzle-orm";

import { monthKeyBounds } from "@/domain/dates";
import type { Entry, Outcome } from "@/domain/types";

import type { Database } from "../client";
import { entries } from "../schema";

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
