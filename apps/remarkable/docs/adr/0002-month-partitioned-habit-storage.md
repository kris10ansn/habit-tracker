# 2. Habits are stored month-partitioned, split from a stable roster

Status: accepted

## Context

Originally all habits lived in one `habits.json`: a bare array where each habit carried its
*entire* entry history (`entries` keyed by every `YYYY-MM-DD` ever marked). Three problems grew
with use: every single entry toggle rewrote the whole file (debounced, but still all of history),
startup parsed all of it, and the file grew without bound. Worse, one bad write or a corrupt parse
could take out everything at once. The app only ever renders the current month, so loading the
whole history was pure cost.

A habit's *config* — name, polarity, suspend visibility, display order — is not month-specific.
Only its **entries** are. That asymmetry is what the split exploits.

## Decision

Persist into two kinds of file under a `data/` subdirectory of the app dir:

- **Roster** `data/roster.json` — `{ "habits": [ { "id", "name", "negative", "hideFromSleep" } ] }`.
  The object envelope (not a bare array) leaves room for future top-level fields. Array order is
  display order. No entries here.
- **Month file** `data/YYYY-MM.json` — `{ "month": "2026-06", "entries": { "<habitId>": { "2026-06-01": "x", … } } }`.
  One per month; **only the current month is ever loaded**.

Each habit gets a stable, client-minted **random** id (see the shared glossary). Month entries key
by id, so rename / reorder / polarity changes touch only the roster. Full `YYYY-MM-DD` keys inside
the month file mean zero key-rewriting between file and the in-memory model.

The in-memory `ListModel` stays the single source of truth (each habit carries the *current*
month's entries). `HabitsStore` becomes a **facade** that keeps its public API but owns the model
plus two `JsonStore` children — a roster store and a month store — each serializing a *projection*
of the same model. Config edits schedule the roster save; entry toggles schedule the month save.
The facade aggregates the children's `saved` / `isLoaded` / `saveFailed` and flushes both on quit.
Load is parallel: month `entries[id]` are folded onto habits by id once both files resolve;
`isLoaded` flips only when both are done.

Saves are **loud, never silent**. `Storage.writeJson` throws on failure instead of returning
`false`; the store catches at the boundary to raise a modal and rethrows so the failure also lands
in the journal — the session keeps running in memory. Because QML/XHR cannot create a directory and
we never SSH, a missing `data/` dir (deploy must `mkdir -p` it) surfaces as a visible save failure
rather than lost data.

## Considered options

- **Duplicate the whole habit per month** (config + that month's entries in each file) — rejected:
  renaming a habit would mean rewriting every month file, and there'd be no single source of truth
  for the roster.
- **Cascade-delete** a habit's entries from every past month file — rejected: it reintroduces the
  exact "touch all history on one edit" cost and multi-write partial-failure risk this redesign
  removes, and would force directory enumeration the app otherwise never needs. Instead, **delete
  leaves orphan entries** in past months; the fold-by-id step ignores ids absent from the roster, so
  they never render.
- **In-app migration** from the legacy `habits.json` — rejected in favour of an **external** Node
  script (`apps/remarkable/scripts/`) the user runs off-device. The app carries no migration code; it
  only ever speaks the new layout.
- **Flat layout** in the app dir — rejected for the `data/` subdir to separate habit data from
  deployed artifacts, accepting the deploy-time `mkdir` requirement (made safe by loud failures).

## Consequences

- Entry toggles and startup are bounded to a single month; the per-edit and parse cost no longer
  grow with history. Per-month files also map cleanly onto a future backend's sync units.
- Corruption is isolated: a bad month file loses one month, never the roster or other months. A
  corrupt or missing file on read is not overwritten — the app falls back in memory (empty month /
  seeded defaults) and still marks itself loaded so the grid never hangs.
- The layout is forward-compatible with a future "view other months" feature without committing to
  it now.
- `settings.json` stays at the app-dir top level (it is neither habit data nor month-partitioned).
