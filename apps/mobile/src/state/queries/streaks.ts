import { useQuery } from "@tanstack/react-query";

import { useDatabase } from "@/db/client";
import * as repo from "@/db/repo";
import type { Habit } from "@/domain/types";

import { streaksKey } from "./keys";

// Streaks depend on the roster's ids and polarities (not order), so those form the query key —
// a polarity flip or add/delete refetches, a reorder does not. The pairs are sorted before joining
// so the key is order-independent; otherwise a reorder would change it and force a needless refetch
// (streak pills/🔥 flashing out and back). Mark mutations invalidate the ["streaks"] prefix.
export function useStreaks(habits: Habit[]) {
    const db = useDatabase();
    const signature = habits
        .map((habit) => `${habit.id}:${habit.polarity}`)
        .sort()
        .join(",");
    return useQuery({
        queryKey: [...streaksKey, signature],
        queryFn: () => repo.getStreaks(db, habits),
        enabled: habits.length > 0,
    });
}
