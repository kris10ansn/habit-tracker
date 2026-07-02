import { dateKey, monthGrid } from './dates';
import type { Entries, EntryState, Habit } from './types';

// Sample habits with entries anchored to the current month so the design shows
// every state — streaks, a miss, a negative habit's implicit-clean run, and a
// slip. Read-only demo data; there is no persistence yet.
const buildDefaultHabits = (): Habit[] => {
  const { year, month, today } = monthGrid();
  const k = (day: number) => dateKey(year, month, day);

  // Marks keyed by day-of-month, dropping any that fall before the 1st.
  const on = (spec: Record<number, EntryState>): Entries =>
    Object.entries(spec).reduce<Entries>((acc, [day, state]) => {
      const d = Number(day);
      if (d >= 1) acc[k(d)] = state;
      return acc;
    }, {});

  return [
    {
      name: 'Read 20 pages',
      negative: false,
      entries: on({
        [today]: 'x',
        [today - 1]: 'x',
        [today - 2]: 'x',
        [today - 3]: 'x',
        [today - 6]: 'o',
      }),
    },
    {
      name: 'Exercise',
      negative: false,
      entries: on({ [today - 1]: 'x', [today - 3]: 'x', [today - 4]: 'x' }),
    },
    {
      name: 'Meditate',
      negative: false,
      entries: on({ [today]: 'x', [today - 1]: 'o', [today - 2]: 'x' }),
    },
    {
      name: 'Drink water',
      negative: false,
      entries: on({ [today]: 'x', [today - 1]: 'x', [today - 2]: 'x' }),
    },
    {
      name: 'Doomscroll',
      negative: true,
      entries: on({ [today - 2]: 'o' }),
    },
    {
      name: 'Late-night snacks',
      negative: true,
      entries: {},
    },
  ];
};

export const DEFAULT_HABITS: Habit[] = buildDefaultHabits();
