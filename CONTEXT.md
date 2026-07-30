# Habit Tracker — Shared Domain

The vocabulary every client and the backend share: what a habit is, how a day's state is recorded,
and what the marks mean. Presentation concerns — grid orientation, e-ink rendering, the suspend
image — are **not** here; each app documents those in its own `CONTEXT.md`. This file is a glossary
and nothing else.

The backend reframes some of this for storage and sync (Outcome, Position, Edit-time, Tombstone) —
those terms live in [`apps/backend/CONTEXT.md`](./apps/backend/CONTEXT.md), which is the source of
truth for the shared model and the sync contract.

## Language

**Habit**:
A behaviour the user tracks day-by-day. Has a stable id, a name, a polarity, and a set of entries.
_Avoid_: task, goal, item.

**Habit id**:
A habit's stable, unique identifier — minted once when the habit is created and never changed,
surviving rename and reorder. It is the key entries and the backend use to reference a habit;
because ids are minted client-side, they are random so two offline clients never collide.
_Avoid_: index, position, slug.

**Polarity**:
Whether a habit is positive or negative. Determines what the entry states mean.

**Positive habit**:
A habit the user wants to perform. The default polarity. An unmarked day means nothing
recorded yet.

**Negative habit**:
A habit the user wants to avoid. Every day is implicitly a success ("didn't slip") until
marked otherwise.
_Avoid_: bad habit.

**Entry**:
A habit's recorded state for a single day, keyed by date. Entries exist only for days the user has
marked; a day with no entry is unmarked. Clearing a day leaves a tombstone rather than dropping the
entry, so the clear can be synced — see the backend glossary.
_Avoid_: mark, check, log, record.

**X mark** (stored `"x"`):
An entry state. On a positive habit it means **done**. On a negative habit a day with no stored
entry is *shown* as an X meaning "stayed clean today" — X is not a stored value there.

**O mark** (stored `"o"`):
An entry state. On a positive habit it means **explicitly not done**. On a negative habit it
means **slipped up** (the only state the user actively records).

**Unmarked** (no entry, or a tombstoned one):
The default entry state. Positive habits cycle Unmarked → X → O → Unmarked. Negative habits
cycle Unmarked (shown as X) → O → Unmarked.

**Default habits**:
The seed list a client uses the first time it runs with no saved data yet. Each client carries its
own copy — the backend seeds no habits, so a first Sync from a fresh client is what populates the
canonical store.
