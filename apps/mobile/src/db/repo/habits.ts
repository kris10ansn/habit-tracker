import { asc, eq } from "drizzle-orm";

import { moveByIndex } from "@/domain/roster";
import type { Habit, Polarity } from "@/domain/types";

import type { Database } from "../client";
import { habits } from "../schema";

export function getHabits(db: Database): Promise<Habit[]> {
    return db
        .select()
        .from(habits)
        .where(eq(habits.deleted, false))
        .orderBy(asc(habits.position));
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
