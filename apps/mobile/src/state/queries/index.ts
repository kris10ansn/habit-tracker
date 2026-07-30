// The screens' entire data seam: TanStack Query wraps the SQLite repo, owning caching (the
// per-month cache is the retention policy — unvisited months are evicted by gcTime), loading/error
// state, and optimistic mutations. It is also where a future server sync would slot in.
// Split per entity; this index is the public surface (streaksKey stays internal).
export { useMonthEntries, useToggleEntry, type ToggleFn } from "./entries";
export { useHabits, useReorderHabit, useUpdateHabit } from "./habits";
export { entriesKey, habitsKey } from "./keys";
export { useStreaks } from "./streaks";
