// The screens' entire data seam: TanStack Query wraps the SQLite repo, owning caching (the
// per-month cache is the retention policy — unvisited months are evicted by gcTime), loading/error
// state, and optimistic mutations. It is also where a future server sync would slot in. See
// docs/adr/0001.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useDatabase } from "@/db/client";
import * as repo from "@/db/repo";
import { nextAction, type MarkAction } from "@/domain/marks";
import { moveByIndex } from "@/domain/roster";
import type { Entry, Habit, Polarity } from "@/domain/types";

export const habitsKey = ["habits"] as const;
export const entriesKey = (monthKey: string) => ["entries", monthKey] as const;
const streaksKey = ["streaks"] as const;

export function useHabits() {
    const db = useDatabase();
    return useQuery({ queryKey: habitsKey, queryFn: () => repo.getHabits(db) });
}

export function useMonthEntries(monthKey: string) {
    const db = useDatabase();
    return useQuery({
        queryKey: entriesKey(monthKey),
        queryFn: () => repo.getMonthEntries(db, monthKey),
    });
}

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

// A resolved tap: the storage action is decided once (from the live cache, see useToggleEntry) and
// carried through both the optimistic write and the DB write, so the two can never diverge.
interface ToggleVariables {
    habitId: string;
    date: string;
    action: MarkAction;
}

// Toggle a habit's mark for a day. Callers pass the habit + polarity, not an outcome snapshot.
export type ToggleFn = (
    habitId: string,
    date: string,
    polarity: Polarity,
) => void;

const applyAction = (
    entries: Entry[],
    habitId: string,
    date: string,
    action: MarkAction,
): Entry[] => {
    const rest = entries.filter(
        (entry) => !(entry.habitId === habitId && entry.date === date),
    );
    if (action.type === "clear") return rest;
    return [
        ...rest,
        {
            habitId,
            date,
            outcome: action.outcome,
            updatedAt: Date.now(),
            deleted: false,
        },
    ];
};

// Toggling writes to the viewed month's cache optimistically, then invalidates that month and the
// streaks (which a mark can extend or break). The returned `toggle` derives the next action from
// the *live cache* at tap time — not a render-time outcome snapshot — so a rapid double-tap
// advances the cycle (unmarked→success→failure→clear) instead of computing the same step twice
// from a stale value. A shared mutation scope serialises the writes so SQLite lands in tap order.
export function useToggleEntry(monthKey: string): ToggleFn {
    const db = useDatabase();
    const queryClient = useQueryClient();
    const key = entriesKey(monthKey);

    const mutation = useMutation({
        scope: { id: "toggle-entry" },
        mutationFn: ({ habitId, date, action }: ToggleVariables) =>
            action.type === "set"
                ? repo.setOutcome(db, habitId, date, action.outcome)
                : repo.clearEntry(db, habitId, date),
        onMutate: async ({ habitId, date, action }) => {
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<Entry[]>(key);
            queryClient.setQueryData<Entry[]>(key, (old = []) =>
                applyAction(old, habitId, date, action),
            );
            return { previous };
        },
        onError: (_error, _variables, context) => {
            if (context) queryClient.setQueryData(key, context.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: key });
            queryClient.invalidateQueries({ queryKey: streaksKey });
        },
    });

    return useCallback<ToggleFn>(
        (habitId, date, polarity) => {
            const entries =
                queryClient.getQueryData<Entry[]>(entriesKey(monthKey)) ?? [];
            const current = entries.find(
                (entry) => entry.habitId === habitId && entry.date === date,
            )?.outcome;
            mutation.mutate({
                habitId,
                date,
                action: nextAction(polarity, current),
            });
        },
        [queryClient, monthKey, mutation],
    );
}

export function useUpdateHabit() {
    const db = useDatabase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: {
            id: string;
            patch: { name?: string; polarity?: Polarity };
        }) => repo.updateHabit(db, variables.id, variables.patch),
        onMutate: async ({ id, patch }) => {
            await queryClient.cancelQueries({ queryKey: habitsKey });
            const previous = queryClient.getQueryData<Habit[]>(habitsKey);
            queryClient.setQueryData<Habit[]>(habitsKey, (old = []) =>
                old.map((habit) =>
                    habit.id === id ? { ...habit, ...patch } : habit,
                ),
            );
            return { previous };
        },
        onError: (_error, _variables, context) => {
            if (context) queryClient.setQueryData(habitsKey, context.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: habitsKey });
            queryClient.invalidateQueries({ queryKey: streaksKey });
        },
    });
}

export function useReorderHabit() {
    const db = useDatabase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: { habitId: string; toIndex: number }) =>
            repo.reorderHabit(db, variables.habitId, variables.toIndex),
        onMutate: async ({ habitId, toIndex }) => {
            await queryClient.cancelQueries({ queryKey: habitsKey });
            const previous = queryClient.getQueryData<Habit[]>(habitsKey);
            queryClient.setQueryData<Habit[]>(habitsKey, (old = []) =>
                moveByIndex(old, habitId, toIndex),
            );
            return { previous };
        },
        onError: (_error, _variables, context) => {
            if (context) queryClient.setQueryData(habitsKey, context.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: habitsKey });
        },
    });
}
