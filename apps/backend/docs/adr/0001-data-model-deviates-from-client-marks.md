# Backend data model: normalized Entry log with semantic Outcomes

The backend stores the same habit-tracking data as the clients but **does not mirror their shape**.
The clients keep a per-habit sparse map `entries: { "YYYY-MM-DD": "x" | "o" }` and a bare
`negative: boolean`, with a negative habit's "stayed clean" X being an unstored display default.
The backend instead models a relational log that "makes sense for an API":

- **`User`** owns habits (GUID PK). Auth is deferred — a stub/seed identity stands in — but
  ownership is in the schema from day one so it never has to be retrofitted onto existing rows.
- **`Habit`**: GUID PK, `UserId` FK, `Name`, `Polarity {Positive, Negative}` (a first-class enum,
  not a bare bool), `Position` (explicit, shared-intent ordering), `CreatedAt`/`UpdatedAt` (UTC).
  Device-only fields like `hideFromSleep` do **not** cross into the backend.
- **`Entry`**: composite PK `(HabitId, Date)` — date-only — which enforces "at most one entry per
  habit per day" in the schema and makes writes a clean upsert. Holds an **`Outcome {Success,
  Failure}`** plus timestamps. Outcome is polarity-independent (X→Success, O→Failure for both);
  absence of a row is the Unmarked/default state. The log is **permissive** — any Outcome may be
  stored against any habit; "negative habits only record Failure" stays a client convention.

The X/O ↔ Outcome mapping, the negative-habit implicit-X, grid orientation, and per-client ordering
preferences all stay client-side. `UpdatedAt` is carried now as the future delta-sync cursor;
soft-delete tombstones and concurrency tokens are deferred until sync is actually built.

## Considered options

- **Mirror the client shape** (store `"x"`/`"o"`, a JSON entries map, `negative` bool). Rejected:
  bakes presentation marks and a client storage trick into the API contract, and a JSON map is poor
  for querying/upserting a relational log.
- **A richer Outcome enum** (Completed/Missed/Slipped/Skipped). Rejected: reintroduces polarity
  coupling and invents states no client records today.
- **Enforce per-polarity Outcome rules** (e.g. reject Success on a negative habit). Rejected:
  couples the backend to a current client quirk; loosening it later is a migration.

## Consequences

- The API speaks Outcome/Polarity/Position/User — terms recorded in `apps/backend/CONTEXT.md`, which
  reframe (not replace) the shared X/O glossary. Clients translate at their edge.
- Adding `UserId`, GUID keys, and `Position` means clients can't just POST their current JSON; an
  adapter/translation layer is implied whenever clients are eventually wired up.
- Hard deletes are fine for now (no client to propagate to); revisit when sync lands.
