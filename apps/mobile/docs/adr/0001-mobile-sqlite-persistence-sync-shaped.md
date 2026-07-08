# Mobile persistence on SQLite, shaped to the backend sync contract

Status: accepted

## Context

`apps/mobile` kept its whole roster in an in-memory React context (`HabitsProvider`), seeded from a
hardcoded demo list on every launch, with entries nested inside each `Habit` as a
`Record<dateKey, "x" | "o">`. Nothing persisted, the Month grid could only ever show the current
month (`monthGrid()` read `new Date()`), and streaks were computed from whatever was in memory.

We want three things: switch months on the Month grid without holding every month in memory, make
data persistent, and — most importantly — shape the data so mobile↔backend sync (root ADR 0003)
becomes a near-additive step later. Mobile and reMarkable never talk directly; both only ever talk
to the server. So the relationship that matters is **mobile↔backend**, and the data layer should be
tailored to the Expo/RN ecosystem and mirror the backend, not the reMarkable file layout.

## Decision

**Persist on `expo-sqlite`, storing backend-shaped rows, read through TanStack Query.** SQLite is
both the persistence layer and the query engine that makes per-month lazy loading trivial, so there
is no separate in-memory store to hand-roll. Only the sync *engine* (the network round-trip, the
merge, server-URL config, tombstone pruning, and Polarity/Outcome wire serialization) is deferred;
the shape it needs is in place now.

- **Backend-shaped, normalized rows — not nested-in-habit.** Two tables mirror the backend entities
  and the `SyncHabit`/`SyncEntry` DTOs:
  - `habits(id TEXT PK, name, polarity, position INTEGER, updatedAt INTEGER, deleted INTEGER)`
  - `entries(habitId, date TEXT 'YYYY-MM-DD', outcome, updatedAt INTEGER, deleted INTEGER,
    PRIMARY KEY (habitId, date))`, indexed on `date` for month-range queries.

- **Store `Outcome`, translate X/O at the render edge.** An entry's value is
  `outcome ∈ {"success","failure"}`, exactly the backend `Entry.Outcome`. `X→success`, `O→failure`
  is polarity-independent; the negative-habit implicit-X and the whole X/O tap cycle become pure
  presentation, living in `domain/marks.ts`. Sync then maps this field 1:1 with no structural
  translation. (reMarkable stores `"x"/"o"` and translates at its sync edge instead — a client
  choice, since the two never share fixtures.)

- **Client-minted RFC-4122 UUIDs** (`expo-crypto` `randomUUID()`), so a mobile habit id *is* the
  backend `Guid` PK — no id-mapping, consistent with root ADR 0003 and the reMarkable client.

- **Polarity as `"positive" | "negative"`**, mirroring the backend's first-class enum rather than a
  bare `negative` boolean.

- **Explicit integer `position`**, reindexed on reorder (matching backend `int Position`, which is
  LWW per habit); array order is not a durable concept in SQLite.

- **Soft-delete tombstones from day one.** Every habit and entry carries `updatedAt` (epoch-ms
  client edit-time — the future LWW merge key) and a `deleted` flag. Clearing an entry or deleting a
  habit sets `deleted = 1` with `updatedAt` = the edit time and keeps the row; it renders as
  Unmarked. This mirrors the wire DTO (`Deleted: bool` + a single `UpdatedAt` that *is* the
  delete-time on a tombstone), **not** the backend entity's separate `DeletedAt` column — which
  never crosses the wire and, on the client, would always equal `updatedAt` when set. Unmarking a
  cell is therefore byte-identical to the write sync sends for a cleared cell. Pruning pushed
  tombstones is deferred with the rest of the sync engine.

- **TanStack Query over a thin SQLite repo.** The repo is plain async functions; TanStack owns
  caching (the month cache keyed by `['entries', monthKey]` *is* the retention policy — `gcTime`
  evicts unvisited months), loading/error state, optimistic mutations, and later the server-sync
  seam. Screens never touch SQLite directly.

- **Unbounded month navigation; past editable, future view-only.** The Month screen owns
  `viewYear/viewMonth`; an empty month is simply zero rows. Future days are never markable (a future
  month is entirely non-interactive). The Today tab stays pinned to the real current month.

- **Streaks via a dedicated cross-month look-back query**, independent of the viewed month. Positive
  habits count consecutive `success` days ending today; negative habits count days since the last
  slip (0 if never slipped). This fixes the old "streak resets at each month's first day" bug, which
  was an artifact of the in-month loop.

## Considered options

- **Keep the in-memory context, add persistence behind it later.** Rejected: the in-memory
  month-query layer would be a throwaway mock of exactly what SQLite gives for free, and the entries
  stay nested-in-habit (one month per habit), which fights both month-nav and sync.
- **Nested per-month maps (reMarkable's on-disk shape) in SQLite/JSON.** Rejected: not the backend's
  flat `(habit, date)` shape, so every sync would need a nest↔flatten transform and tombstones sit
  awkwardly inside a map.
- **Store `"x"/"o"` and translate at the sync edge** (as reMarkable does). Viable, but since mobile
  only ever talks to the Outcome-speaking backend, storing `outcome` makes the sync boundary an
  identity map and keeps the X/O concern where it belongs — rendering.
- **Drizzle `useLiveQuery`** for reactivity without a manual cache, or a **plain Context + repo**
  with a hand-rolled write-through cache. Both workable; TanStack Query was chosen for its built-in
  loading/mutation/invalidation machinery and because it is the natural home for server-sync
  mutations when they land.
- **Denormalized streak counters** maintained on write. Rejected: write-time maintenance and messy
  invalidation, and it muddies what sync carries; a bounded look-back query is cheap and stateless.

## Consequences

- New deps: `expo-sqlite`, `expo-crypto`, `@tanstack/react-query`. Providers `SQLiteProvider`
  (with a `PRAGMA user_version` migration that also seeds first-run data) and `QueryClientProvider`
  wrap the app in `_layout.tsx`; `HabitsProvider` is removed.
- `domain/` is reshaped: `types.ts` (flat `Habit` + `Entry`, `Outcome`/`Polarity`), `marks.ts`
  (`markView`/`nextAction`/`isSuccess` in Outcome terms), `dates.ts` (parameterized `monthView`,
  `monthKey`, `addMonth`, `daysBetween`). A `db/` layer holds the schema and repo; a `state/`
  layer holds the query hooks.
- First run seeds the default habits **and** the demo entries once (anchored to the first-run date),
  so the app opens populated; these are real persistent rows thereafter.
- Streak semantics change slightly: a never-slipped negative habit shows no streak until it has a
  recorded slip to count from (no `createdAt` is carried on the wire, so there is no honest earlier
  anchor). This is intentional and documented here.
- Deferred: the sync engine itself, tombstone pruning, and the Polarity/Outcome wire serialization —
  all additive on top of this shape (see root ADR 0003).
