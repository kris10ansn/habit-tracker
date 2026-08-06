// Shared habit vocabulary — see the monorepo-root CONTEXT.md glossary. Mobile stores the
// backend's shape (apps/backend Entities + SyncHabit/SyncEntry DTOs) so mobile↔backend sync is a
// near-identity map; the X/O reading is a render concern (see marks.ts). Mirrored are the fields
// the client owns: the backend's audit `UpdatedAt` is server-stamped and absent from the sync wire
// format, whose `editedAt` is the edit-time this file mirrors — so there is no local counterpart to
// the audit stamp.

// These spellings are the backend's enum member names verbatim (apps/backend Entities/Outcome.cs,
// Entities/Polarity.cs). The API serialises enums with a bare `JsonStringEnumConverter` — no naming
// policy — so `"Success"`/`"Positive"` is exactly what the wire carries and what Postgres stores.
// Matching it byte-for-byte is what keeps sync a mapping-free identity. Client-local unions that
// never leave the device (`MarkKind`, `MarkAction["type"]` in marks.ts) stay lowercase per TS idiom.
export type Outcome = "Success" | "Failure";
export type Polarity = "Positive" | "Negative";

// A tracked behaviour. Mirrors the backend Habit / SyncHabit: a stable client-minted id (== the
// backend Guid PK), an explicit sort position, an epoch-ms create-time, an edit-time (the
// last-write-wins merge key), and a soft-delete timestamp. `createdAt` anchors a negative habit's
// streak (see marks.ts / repo.getStreaks); `editedAt` is stamped on every write and drives sync
// conflict resolution; `deletedAt` (null when alive) holds the delete-time on a tombstone.
export interface Habit {
    id: string;
    name: string;
    polarity: Polarity;
    position: number;
    createdAt: number;
    editedAt: number;
    deletedAt: number | null;
}

// One day's recorded result for a habit, keyed by (habitId, date). Absence of an alive row is the
// Unmarked state; a tombstone (`deletedAt` non-null) also reads as Unmarked. Mirrors backend
// Entry / SyncEntry, with `editedAt` as the last-write-wins merge key.
export interface Entry {
    habitId: string;
    date: string; // YYYY-MM-DD
    outcome: Outcome;
    editedAt: number;
    deletedAt: number | null;
}
