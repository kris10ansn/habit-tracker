# Context Map

The habit tracker is a monorepo: multiple clients over one shared habit domain, with a backend
planned to own persistence and sync. Each client documents its own context; the vocabulary they
all speak lives at the root.

## Contexts

- [Shared domain](./CONTEXT.md) — the habit/entry vocabulary every client and the backend speak
- [reMarkable client](./apps/remarkable/CONTEXT.md) — QML scene on the reMarkable 1; adds suspend-image, settings, and edit-mode terms
- **mobile client** (`apps/mobile`) — expo app; no context-specific terms yet, so no `CONTEXT.md` (renders the shared grid transposed to portrait). Add one lazily when the first mobile-only term appears.
- [Backend](./apps/backend/CONTEXT.md) — C#/ASP.NET Core + EF Core service that will own canonical persistence and sync; adds User (ownership), Outcome (Success/Failure), and Position

## Relationships

- **Shared → reMarkable / mobile**: both clients render the same Habit × Entry data. The reMarkable
  lays habits as rows × days as columns (landscape); the mobile client transposes — days as rows ×
  habits as columns (portrait). Orientation is presentation, not domain.
- **Backend → clients**: owns the canonical Habit/Entry records and syncs them to clients. The
  **reMarkable is the first wired client** — state-based last-write-wins Sync over a single endpoint,
  per-entity Edit-time as the merge key, Tombstones for deletes (see
  [`docs/adr/0003`](./docs/adr/0003-offline-first-sync.md)). It stays standalone/offline when no
  Server URL is set. Mobile is still unwired and carries its own default-habits seed; the backend
  does not seed defaults (new Users start empty).
- **Shared ↔ Backend**: the backend stores the same data but reframes it for a relational API — it
  speaks **Outcome** (Success/Failure) rather than the clients' X/O marks, normalizes Entry into
  rows keyed by `(habit, date)` rather than a per-habit date→mark map, and adds ownership (User)
  and ordering (Position). The X/O ↔ Outcome and implicit-X translations stay on the client side.
