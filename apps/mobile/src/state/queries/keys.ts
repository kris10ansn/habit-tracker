// Query keys for the whole seam, in one place because they are the cross-entity coupling: habit
// and entry mutations both invalidate the streaks prefix. `streaksKey` is package-internal — it is
// always used with a signature suffix (see streaks.ts), so nothing outside targets it directly.
export const habitsKey = ["habits"] as const;
export const entriesKey = (monthKey: string) => ["entries", monthKey] as const;
export const streaksKey = ["streaks"] as const;
export const settingsKey = ["settings"] as const;
