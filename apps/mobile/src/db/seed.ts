import * as Crypto from "expo-crypto";

import { shiftDay, todayKey } from "@/domain/dates";
import type { Outcome, Polarity } from "@/domain/types";

import type { Database } from "./client";
import { entries, habits } from "./schema";

// First-run roster, with demo entries so the app opens populated. `marks` is keyed by day-offset
// back from the seed date (0 = today), covering every display state — a streak, a miss, a
// negative habit's clean run, and a slip. Seeded once into an empty database; thereafter these are
// ordinary user rows.
interface SeedHabit {
    name: string;
    polarity: Polarity;
    marks: Record<number, Outcome>;
}

const SEED_HABITS: SeedHabit[] = [
    {
        name: "Read 20 pages",
        polarity: "positive",
        marks: {
            0: "success",
            1: "success",
            2: "success",
            3: "success",
            6: "failure",
        },
    },
    {
        name: "Exercise",
        polarity: "positive",
        marks: { 1: "success", 3: "success", 4: "success" },
    },
    {
        name: "Meditate",
        polarity: "positive",
        marks: { 0: "success", 1: "failure", 2: "success" },
    },
    {
        name: "Drink water",
        polarity: "positive",
        marks: { 0: "success", 1: "success", 2: "success" },
    },
    { name: "Doomscroll", polarity: "negative", marks: { 2: "failure" } },
    { name: "Late-night snacks", polarity: "negative", marks: {} },
];

// Seed the defaults only into a fresh database (run after migrations, see _layout).
export async function seedIfEmpty(db: Database): Promise<void> {
    const [existing] = await db.select({ id: habits.id }).from(habits).limit(1);
    if (existing) return;

    const now = Date.now();
    const today = todayKey();
    // Backdate creation so the clean negative demo habit ("Late-night snacks", no slips) shows a
    // streak off its createdAt anchor — the case the anchor exists for (see repo.getStreaks).
    const createdAt = now - 30 * 86_400_000;

    await db.transaction(async (tx) => {
        for (let position = 0; position < SEED_HABITS.length; position += 1) {
            const seed = SEED_HABITS[position];
            const id = Crypto.randomUUID();

            await tx.insert(habits).values({
                id,
                name: seed.name,
                polarity: seed.polarity,
                position,
                createdAt,
                updatedAt: now,
            });

            const rows = Object.entries(seed.marks).map(
                ([offset, outcome]) => ({
                    habitId: id,
                    date: shiftDay(today, -Number(offset)),
                    outcome,
                    updatedAt: now,
                }),
            );
            if (rows.length > 0) await tx.insert(entries).values(rows);
        }
    });
}
