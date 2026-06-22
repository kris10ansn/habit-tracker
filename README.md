# Habit Tracker

A habit tracker built as a small monorepo: multiple clients over one shared habit domain, with a
backend planned to own persistence and sync.

```
apps/
├── remarkable/   Habit tracker for the reMarkable 1 e-ink tablet (pure QML, XOVI + rm-appload)
└── mobile/       Mobile app (expo / React Native / TypeScript)
```

Both render the same model — habits and their per-day X/O entries for the current month. The
reMarkable lays it out landscape (habits as rows, days as columns); the mobile app transposes it to
portrait (days as rows, habits as columns).

## Domain

- [`CONTEXT.md`](./CONTEXT.md) — the shared glossary (Habit, Entry, X/O marks, polarity, …)
- [`CONTEXT-MAP.md`](./CONTEXT-MAP.md) — the contexts and how they relate
- [`docs/adr/`](./docs/adr/) — system-wide architecture decisions

## Working in the repo

Requires [pnpm](https://pnpm.io). From the root:

```sh
pnpm install        # installs deps for all workspace packages
pnpm format         # prettier across the repo
```

### reMarkable app (`apps/remarkable/`)

A pure-QML scene built with `make` and deployed to the device over SSH. See
[`apps/remarkable/README.md`](./apps/remarkable/README.md). In short, from that directory:

```sh
make build          # produces build/resources.rcc
make deploy         # scps to the tablet
```

### Mobile app (`apps/mobile/`)

Currently just a dummy expo app with no functionality. To run, from the root:

```sh
pnpm --filter @habit-tracker/mobile start    # start the expo dev server
```

