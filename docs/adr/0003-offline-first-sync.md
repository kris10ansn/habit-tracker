# 3. Offline-first sync between the reMarkable client and the backend

Status: accepted

## Context

The reMarkable client and the backend were built to the same habit model but never connected — the
client persists locally (month-partitioned `roster.json` + `YYYY-MM.json`, see reMarkable ADR 0002)
while the backend owns a canonical relational store (backend ADR 0001) with `UpdatedAt` earmarked as
a "future delta-sync cursor" and tombstones/concurrency deliberately deferred "until sync is built."
This is that build. The reMarkable is the first client wired up; it must keep running **standalone
and fully offline** (no server configured = pure local app) and **sync** with a user-configured
server when one is reachable. Mobile stays read-only and unwired for now.

## Decision

**State-based, last-write-wins sync through one server endpoint.** The client sends its current
*state* (the roster plus the month(s) it holds) and receives the merged authoritative state back;
the merge logic lives in C# (tested), not QML (no `async`/`await`, no tests).

- **Identity — client-minted UUIDs.** The client mints RFC-4122 UUIDs (replacing the base36 scheme)
  so a client id *is* the backend's `Guid` Habit PK — no id-mapping table, no translation. An
  external one-time script migrates existing on-device data (re-mint ids, re-key every month file,
  backfill timestamps), consistent with reMarkable ADR 0002's external-migration precedent.

- **Per-entity edit-time as the merge key.** Every habit and every entry carries an `updatedAt`
  stamped by the editing client as an absolute UTC instant (epoch ms — timezone-agnostic). The
  server stores that client edit-time **verbatim** as the row's merge key and compares edit-time vs
  edit-time, so clock domains never cross; the backend's own server-stamped `UpdatedAt` stays a
  separate audit field. On the client, an entry value changes from a bare `"x"`/`"o"` string to an
  inline `{ state, updatedAt }` object.

- **Deletes are timestamped tombstones.** Deleting a habit or clearing an entry records a soft-delete
  with a UTC timestamp (`DeletedAt` on backend `Habit` and `Entry` — the tombstones the backend ADR
  deferred), so a deletion correctly beats an older edit and loses to a newer re-add. The client
  carries pending habit-delete tombstones in a small sync-state sidecar until pushed; cleared entries
  ride along inline as a cleared marker. After a successful sync the server is authoritative and the
  client may prune pushed tombstones.

- **No high-water-mark cursor (v1).** Because the merge is purely per-row edit-time comparison,
  correctness does not depend on a "changed since" cursor — it remains a later pull optimization, not
  part of v1.

- **No auth (v1).** Sync acts as the backend's seeded stub user; the client stores only a **server
  URL** (in `settings.json`). The endpoint is unauthenticated, so it must run on a trusted network
  (home LAN / Tailscale / VPN), not the open internet. `CurrentUser` remains the seam for real auth.

- **Triggers & feedback.** Sync fires on app open, debounced after edits, and via a manual "Sync now"
  button — never during quit/teardown (a network round-trip there is fragile in QML). Failures while
  offline are silent ambient state (a dedicated **sync status** line beneath the suspend status line);
  only genuine misconfiguration (malformed URL, server rejection) is shown loudly.

## Considered options

- **Op-log replay / snapshot LWW** instead of state-based per-entity merge — an op-log needs a durable
  mutation journal the state-file restructure doesn't have; snapshot LWW ignores the per-id/per-month
  granularity and silently loses a second device's edits.
- **Backend adopts the client's string ids** (string PK) or **a clientId ↔ Guid mapping** — rejected
  in favour of client-minted UUIDs: no schema-wide PK type change and no two id spaces to keep
  aligned (cost: an external re-key migration of existing on-device data).
- **Client-side merge** or **dumb REST + delta pull** — rejected: the hardest, least-testable logic
  would land in QML, or a sync would split across push+pull calls. One server endpoint keeps merge in
  C# and the client a thin "send state, accept truth."
- **Cursor high-water-mark as the clock** (no per-entity timestamps) — simpler client storage but only
  correct while a single device writes; per-entity timestamps were chosen for genuine concurrent-edit
  fidelity, at the cost of inline entry objects.
- **Set-reconciliation deletes** (no tombstones) — single-writer-only; would resurrect or wrongly
  delete habits under two writers.

## Consequences

- **Backend:** add `DeletedAt` soft-delete to `Habit` and `Entry`; persist the client edit-time merge
  key per row distinct from `UpdatedAt`; expose `Entry` over HTTP; add the single sync endpoint that
  merges and returns authoritative state. Habit `Position`/ordering travels in the roster and is LWW
  per habit.
- **reMarkable:** mint UUIDs; entry values become `{ state, updatedAt }` (touches the grid, suspend
  draw, the projections, the toggle, and the fold); a sync-state sidecar holds pending tombstones; a
  server-URL field and a sync-status line join Settings; an external migration script ships once and
  is then removed.
- **Security:** the unauthenticated endpoint is a deliberate v1 limitation, not an oversight —
  recorded so it isn't exposed publicly.
- **Deferred:** mobile sync; the pull-optimization cursor; real authentication.
