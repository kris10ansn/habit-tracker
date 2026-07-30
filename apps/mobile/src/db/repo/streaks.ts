import {
    and,
    count,
    eq,
    inArray,
    isNull,
    lte,
    max,
    min,
    sql,
} from "drizzle-orm";

import {
    dateKeyOf,
    daysBetween,
    earlierKey,
    laterKey,
    shiftDay,
    todayKey,
} from "@/domain/dates";
import type { HabitStreak } from "@/domain/marks";
import type { Habit } from "@/domain/types";

import type { Database } from "../client";
import { entries } from "../schema";

// A dedicated cross-month look-back, independent of the viewed month. Positive
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

// Positive-habit streak via SQL gaps-and-islands: `julianday(date) - row_number()` is constant
// across an unbroken run, so grouping by it yields each run's length (COUNT) and end (MAX date);
// we take the runs ending today (→ current) and yesterday (→ established).
const getStreaksPositive = async (
    db: Database,
    habit: Habit,
    today: string,
): Promise<[string, HabitStreak]> => {
    const yesterday = shiftDay(today, -1);

    const islandKey = sql<number>`julianday(${entries.date}) - row_number() over (order by ${entries.date})`;

    const successes = db.$with("successes").as(
        db
            .select({
                date: entries.date,
                islandKey: islandKey.as("islandKey"),
            })
            .from(entries)
            .where(
                and(
                    eq(entries.habitId, habit.id),
                    eq(entries.outcome, "success"),
                    isNull(entries.deletedAt),
                    lte(entries.date, today),
                ),
            ),
    );

    const runs = await db
        .with(successes)
        .select({ length: count(), endsAt: max(successes.date) })
        .from(successes)
        .groupBy(sql`${successes.islandKey}`)
        .having(inArray(max(successes.date), [today, yesterday]));

    const runEndingToday = runs.find((run) => run.endsAt === today);
    const runEndingYesterday = runs.find((run) => run.endsAt === yesterday);

    // When today is a success its run absorbs yesterday's, so `established` is just one shorter.
    // Otherwise the run (if any) ended yesterday and today contributes nothing.
    const current = runEndingToday?.length ?? 0;
    const established = runEndingToday
        ? current - 1
        : (runEndingYesterday?.length ?? 0);

    return [habit.id, { current, established }];
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
                isNull(entries.deletedAt),
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
                isNull(entries.deletedAt),
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
