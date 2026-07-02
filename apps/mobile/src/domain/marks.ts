// Presentation-neutral reading of a habit's state for a day, derived from the
// shared X/O glossary. Components map `kind` to styling; they never re-derive the
// X/O semantics themselves. See the monorepo-root CONTEXT.md.
import { dateKey, type MonthGrid } from './dates';
import type { Habit } from './types';

export type MarkKind = 'done' | 'missed' | 'slip' | 'clean' | 'empty';

export interface MarkView {
  kind: MarkKind;
  glyph: string;
  label: string;
  // Future clean days on a negative habit: "didn't slip" hasn't happened yet.
  muted: boolean;
}

// Positive: x = done, o = missed, absent = unmarked.
// Negative: o = slipped; any other day is an (implicit) clean day.
export const markView = (habit: Habit, key: string, isFuture = false): MarkView => {
  const entry = habit.entries[key];

  if (habit.negative) {
    if (entry === 'o') return { kind: 'slip', glyph: '✕', label: 'Slipped', muted: false };
    return { kind: 'clean', glyph: '✓', label: 'Clean', muted: isFuture };
  }

  if (entry === 'x') return { kind: 'done', glyph: '✓', label: 'Done', muted: false };
  if (entry === 'o') return { kind: 'missed', glyph: '✕', label: 'Missed', muted: false };
  return { kind: 'empty', glyph: '–', label: 'Not yet', muted: false };
};

// A day "counts" when a positive habit is done, or a negative habit didn't slip.
export const isSuccess = (habit: Habit, key: string): boolean =>
  habit.negative ? habit.entries[key] !== 'o' : habit.entries[key] === 'x';

// Consecutive successful days ending today (within the viewed month).
export const currentStreak = (habit: Habit, grid: MonthGrid): number => {
  let streak = 0;
  for (let day = grid.today; day >= 1; day -= 1) {
    if (!isSuccess(habit, dateKey(grid.year, grid.month, day))) break;
    streak += 1;
  }
  return streak;
};

export const streakLabel = (habit: Habit, streak: number): string => {
  if (habit.negative) return streak > 0 ? `${streak}-day clean streak` : 'Slipped today';
  return streak > 0 ? `${streak}-day streak` : 'Tap to log today';
};
