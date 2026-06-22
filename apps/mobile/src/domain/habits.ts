import { dateKey, monthGrid } from './dates';
import type { Habit } from './types';

// The reMarkable client's default habits, plus a few static marks in the current
// month so the grid demonstrates the X/O states. Read-only sample data — there is
// no persistence yet.
const buildDefaultHabits = (): Habit[] => {
  const { year, month } = monthGrid();
  const k = (day: number) => dateKey(year, month, day);

  return [
    { name: 'Read 20 pages', negative: false, entries: { [k(1)]: 'x', [k(2)]: 'x', [k(3)]: 'o' } },
    { name: 'Exercise', negative: false, entries: { [k(1)]: 'x', [k(3)]: 'x' } },
    { name: 'Meditate', negative: false, entries: { [k(2)]: 'o' } },
    { name: 'No screens after 22:00', negative: false, entries: { [k(1)]: 'o', [k(2)]: 'x' } },
    { name: 'Journal', negative: false, entries: { [k(1)]: 'x' } },
  ];
};

export const DEFAULT_HABITS: Habit[] = buildDefaultHabits();
