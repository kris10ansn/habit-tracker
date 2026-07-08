// Shared habit vocabulary — see the monorepo-root CONTEXT.md glossary. Mobile stores the
// backend's shape (apps/backend Entities + SyncHabit/SyncEntry DTOs) so mobile↔backend sync is a
// near-identity map; the X/O reading is a render concern (see marks.ts). See docs/adr/0001.

export type Outcome = "success" | "failure";
export type Polarity = "positive" | "negative";

// A tracked behaviour. Mirrors the backend Habit / SyncHabit: a stable client-minted id (== the
// backend Guid PK), an explicit sort position, an epoch-ms edit-time (the last-write-wins merge
// key), and a soft-delete flag whose `updatedAt` doubles as the delete-time on a tombstone.
export interface Habit {
    id: string;
    name: string;
    polarity: Polarity;
    position: number;
    updatedAt: number;
    deleted: boolean;
}

// One day's recorded result for a habit, keyed by (habitId, date). Absence of an alive row is the
// Unmarked state; a tombstone (`deleted`) also reads as Unmarked. Mirrors backend Entry / SyncEntry.
export interface Entry {
    habitId: string;
    date: string; // YYYY-MM-DD
    outcome: Outcome;
    updatedAt: number;
    deleted: boolean;
}
