# Context Map

The habit tracker is a monorepo: multiple clients over one shared habit domain, with a backend
planned to own persistence and sync. Each client documents its own context; the vocabulary they
all speak lives at the root.

## Contexts

- [Shared domain](./CONTEXT.md) — the habit/entry vocabulary every client and the future backend speak
- [reMarkable client](./apps/remarkable/CONTEXT.md) — QML scene on the reMarkable 1; adds suspend-image, settings, and edit-mode terms
- **mobile client** (`apps/mobile`) — expo app; no context-specific terms yet, so no `CONTEXT.md` (renders the shared grid transposed to portrait). Add one lazily when the first mobile-only term appears.

## Relationships

- **Shared → reMarkable / mobile**: both clients render the same Habit × Entry data. The reMarkable
  lays habits as rows × days as columns (landscape); the mobile client transposes — days as rows ×
  habits as columns (portrait). Orientation is presentation, not domain.
- **Future backend**: will own the canonical Habit/Entry records and sync them to both clients.
  Until then each client carries its own default-habits seed and (for reMarkable) local persistence.
