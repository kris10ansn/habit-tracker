// Shared habit vocabulary — see the monorepo-root CONTEXT.md glossary.
// Mirrors the reMarkable client's model so a future backend can speak one shape.

export type EntryState = "x" | "o";

// Entries keyed by date key (YYYY-MM-DD). Absence of a key is the Unmarked state.
export type Entries = Record<string, EntryState>;

export interface Habit {
    // Stable identity: a habit keeps its id through renames and reorders, so
    // lists key on it. Opaque — not part of the shared cross-client vocabulary.
    id: string;
    name: string;
    negative: boolean;
    entries: Entries;
}
