import {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
} from "react";

import { DEFAULT_HABITS } from "@/domain/habits";
import { nextEntry } from "@/domain/marks";
import type { Habit } from "@/domain/types";

interface HabitsContextValue {
    habits: Habit[];
    toggleEntry: (habitId: string, dateKey: string) => void;
    updateHabit: (habitId: string, partial: Partial<Omit<Habit, "id">>) => void;
    reorderHabit: (habitId: string, toIndex: number) => void;
}

const HabitsContext = createContext<HabitsContextValue | null>(null);

// In-memory habit state seeded from the sample roster — the single source both the
// Today and Month tabs read, so a mark toggled on one shows on the other. There is
// no persistence yet; this is the seam a future backend/store plugs into.
export function HabitsProvider({ children }: { children: ReactNode }) {
    const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);

    const toggleEntry = useCallback((habitId: string, dateKey: string) => {
        setHabits((current) =>
            current.map((habit) => {
                if (habit.id !== habitId) return habit;
                const next = nextEntry(habit, dateKey);
                const entries = { ...habit.entries };
                // Unmarked is the absence of a key (see Entries), so cycling back to it
                // drops the entry rather than storing a sentinel.
                if (next === undefined) delete entries[dateKey];
                else entries[dateKey] = next;
                return { ...habit, entries };
            }),
        );
    }, []);

    const updateHabit = useCallback(
        (habitId: string, partial: Partial<Omit<Habit, "id">>) => {
            setHabits((current) =>
                current.map((habit) =>
                    habit.id === habitId ? { ...habit, ...partial } : habit,
                ),
            );
        },
        [],
    );

    const reorderHabit = useCallback((habitId: string, toIndex: number) => {
        setHabits((current) => {
            const fromIndex = current.findIndex(
                (habit) => habit.id === habitId,
            );
            if (fromIndex === -1 || fromIndex === toIndex) return current;
            const next = [...current];
            const [habit] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, habit);
            return next;
        });
    }, []);

    return (
        <HabitsContext.Provider
            value={{ habits, toggleEntry, updateHabit, reorderHabit }}
        >
            {children}
        </HabitsContext.Provider>
    );
}

export function useHabits(): HabitsContextValue {
    const value = useContext(HabitsContext);
    if (!value)
        throw new Error("useHabits must be used within a HabitsProvider");
    return value;
}
