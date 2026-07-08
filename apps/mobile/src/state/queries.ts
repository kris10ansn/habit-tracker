// The screens' entire data seam: TanStack Query wraps the SQLite repo, owning caching (the
// per-month cache is the retention policy — unvisited months are evicted by gcTime), loading/error
// state, and optimistic mutations. It is also where a future server sync would slot in. See
// docs/adr/0001.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";

import * as repo from "@/db/repo";
import { nextAction } from "@/domain/marks";
import type { Entry, Habit, Outcome, Polarity } from "@/domain/types";

export const habitsKey = ["habits"] as const;
export const entriesKey = (monthKey: string) => ["entries", monthKey] as const;
const streaksKey = ["streaks"] as const;

export function useHabits() {
    const db = useSQLiteContext();
    return useQuery({ queryKey: habitsKey, queryFn: () => repo.getHabits(db) });
}

export function useMonthEntries(monthKey: string) {
    const db = useSQLiteContext();
    return useQuery({
        queryKey: entriesKey(monthKey),
        queryFn: () => repo.getMonthEntries(db, monthKey),
    });
}

// Streaks depend on the roster's ids and polarities (not order), so those form the query key —
// a polarity flip or add/delete refetches, a reorder does not. Mutations that change marks
// invalidate the ["streaks"] prefix explicitly.
export function useStreaks(habits: Habit[]) {
    const db = useSQLiteContext();
    const signature = habits
        .map((habit) => `${habit.id}:${habit.polarity}`)
        .join(",");
    return useQuery({
        queryKey: [...streaksKey, signature],
        queryFn: () => repo.getStreaks(db, habits),
        enabled: habits.length > 0,
    });
}

export interface ToggleInput {
    habitId: string;
    date: string;
    polarity: Polarity;
    outcome: Outcome | undefined;
}

const applyToggle = (entries: Entry[], input: ToggleInput): Entry[] => {
    const rest = entries.filter(
        (entry) =>
            !(entry.habitId === input.habitId && entry.date === input.date),
    );
    const action = nextAction(input.polarity, input.outcome);
    if (action.type === "clear") return rest;
    return [
        ...rest,
        {
            habitId: input.habitId,
            date: input.date,
            outcome: action.outcome,
            updatedAt: Date.now(),
            deleted: false,
        },
    ];
};

// Toggling writes to the viewed month's cache optimistically, then invalidates that month and the
// streaks (which a mark can extend or break).
export function useToggleEntry(monthKey: string) {
    const db = useSQLiteContext();
    const queryClient = useQueryClient();
    const key = entriesKey(monthKey);

    return useMutation({
        mutationFn: (input: ToggleInput) => {
            const action = nextAction(input.polarity, input.outcome);
            return action.type === "set"
                ? repo.setOutcome(db, input.habitId, input.date, action.outcome)
                : repo.clearEntry(db, input.habitId, input.date);
        },
        onMutate: async (input) => {
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<Entry[]>(key);
            queryClient.setQueryData<Entry[]>(key, (old = []) =>
                applyToggle(old, input),
            );
            return { previous };
        },
        onError: (_error, _input, context) => {
            if (context) queryClient.setQueryData(key, context.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: key });
            queryClient.invalidateQueries({ queryKey: streaksKey });
        },
    });
}

export function useUpdateHabit() {
    const db = useSQLiteContext();
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

const moveHabit = (
    habits: Habit[],
    habitId: string,
    toIndex: number,
): Habit[] => {
    const fromIndex = habits.findIndex((habit) => habit.id === habitId);
    if (fromIndex === -1 || fromIndex === toIndex) return habits;
    const next = [...habits];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
};

export function useReorderHabit() {
    const db = useSQLiteContext();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: { habitId: string; toIndex: number }) =>
            repo.reorderHabit(db, variables.habitId, variables.toIndex),
        onMutate: async ({ habitId, toIndex }) => {
            await queryClient.cancelQueries({ queryKey: habitsKey });
            const previous = queryClient.getQueryData<Habit[]>(habitsKey);
            queryClient.setQueryData<Habit[]>(habitsKey, (old = []) =>
                moveHabit(old, habitId, toIndex),
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
