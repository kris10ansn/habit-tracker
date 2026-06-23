# CLAUDE.md

Guidance for Claude Code at the **monorepo root**. Per-app specifics live in each app's own
`CLAUDE.md` — read those before working inside an app.

## Maintaining this file

Keep it lean: this is the cross-cutting layer only. Anything specific to one app belongs in that
app's `CLAUDE.md`, not here. Prefer tightening existing sections over appending; remove obsolete
guidance.

## What this is

A **habit tracker** built as a pnpm monorepo with two clients over one shared habit domain, and a
backend planned to own persistence and sync:

```
/
├── apps/
│   ├── remarkable/   QML scene for the reMarkable 1 (XOVI + rm-appload). Built with make.
│   └── mobile/       expo (React Native, TypeScript) app. Built with pnpm/expo.
├── CONTEXT.md        shared habit glossary (Habit, Entry, X/O, polarity, …)
├── CONTEXT-MAP.md    map of the contexts and how they relate
└── docs/adr/         system-wide architecture decisions
```

The shared habit vocabulary lives in the root [`CONTEXT.md`](./CONTEXT.md); each client adds its own
context (see [`CONTEXT-MAP.md`](./CONTEXT-MAP.md)). Use those terms in code, comments, and docs.

## Hard rule: never SSH to the device

Under no circumstance may the agent run `ssh`, `scp`, `rsync`, `make deploy`, `make remove`, or any
other command that touches the reMarkable — including "read-only" probes like `ssh remarkable
journalctl …`. The user runs all device-side commands and pastes back the output. If a step needs
the device, describe what to run and wait. This applies even when a `make` target wraps the SSH.

## Per-app guidance

- **`apps/remarkable/`** — pure-QML, built by `make` (run from that dir). Qt 5.15 / e-ink display
  constraints, apploader loading quirks, never-SSH. See [`apps/remarkable/CLAUDE.md`](./apps/remarkable/CLAUDE.md).
- **`apps/mobile/`** — expo + TypeScript. See `apps/mobile/` for its README and conventions.

## Workspace commands

- `pnpm install` — install all workspace deps from the root. `.npmrc` sets `node-linker=hoisted`
  because Metro (expo's bundler) doesn't follow pnpm's symlinked `node_modules`.
- **Aggregates** (run in every app that defines the script): `pnpm format`, `pnpm lint`,
  `pnpm typecheck`.
- **Per-app delegators** (root scripts that call into one app):
  - `pnpm mobile:start` (also `mobile:android` / `mobile:ios` / `mobile:web`).
  - `pnpm remarkable:build` (also `remarkable:clean` / `remarkable:deploy` / `remarkable:remove`,
    which shell out to `make` — `deploy`/`remove` touch the device, so user-only).
- Anything not wired above: `pnpm --filter @habit-tracker/<app> run <script>`.

## Code style

Shared `.prettierrc.json` applies repo-wide. Prefer verbose, descriptive names in code and
persisted/domain data; avoid single-letter or cryptic names except for very small local indices.
Language-specific style rules live per app (QML/JS conventions in `apps/remarkable/CLAUDE.md`).
