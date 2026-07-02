import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { DEFAULT_HABITS } from '@/domain/habits';
import { nextEntry } from '@/domain/marks';
import type { Habit } from '@/domain/types';

interface HabitsContextValue {
  habits: Habit[];
  // Cycle one habit's mark for a day through the shared X/O tap states.
  toggleEntry: (habitIndex: number, dateKey: string) => void;
}

const HabitsContext = createContext<HabitsContextValue | null>(null);

// In-memory habit state seeded from the sample roster — the single source both the
// Today and Month tabs read, so a mark toggled on one shows on the other. There is
// no persistence yet; this is the seam a future backend/store plugs into.
export function HabitsProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);

  const toggleEntry = useCallback((habitIndex: number, dateKey: string) => {
    setHabits((current) =>
      current.map((habit, index) => {
        if (index !== habitIndex) return habit;
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

  return (
    <HabitsContext.Provider value={{ habits, toggleEntry }}>{children}</HabitsContext.Provider>
  );
}

export function useHabits(): HabitsContextValue {
  const value = useContext(HabitsContext);
  if (!value) throw new Error('useHabits must be used within a HabitsProvider');
  return value;
}
