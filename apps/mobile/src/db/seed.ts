import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { shiftDay, todayKey } from "@/domain/dates";
import type { Outcome, Polarity } from "@/domain/types";

// First-run roster, with demo entries so the app opens populated. `marks` is keyed by day-offset
// back from the seed date (0 = today), covering every display state — a streak, a miss, a
// negative habit's clean run, and a slip. Seeded once into an empty database (see schema.migrate);
// thereafter these are ordinary user rows.
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

export async function seedDefaultData(db: SQLiteDatabase): Promise<void> {
    const now = Date.now();
    const today = todayKey();

    await db.withTransactionAsync(async () => {
        for (let position = 0; position < SEED_HABITS.length; position += 1) {
            const seed = SEED_HABITS[position];
            const id = Crypto.randomUUID();

            await db.runAsync(
                "INSERT INTO habits (id, name, polarity, position, updatedAt) VALUES (?, ?, ?, ?, ?)",
                id,
                seed.name,
                seed.polarity,
                position,
                now,
            );

            for (const [offset, outcome] of Object.entries(seed.marks)) {
                await db.runAsync(
                    "INSERT INTO entries (habitId, date, outcome, updatedAt) VALUES (?, ?, ?, ?)",
                    id,
                    shiftDay(today, -Number(offset)),
                    outcome,
                    now,
                );
            }
        }
    });
}
