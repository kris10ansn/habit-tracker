# CLAUDE.md — mobile app

@AGENTS.md

The `apps/mobile/` client of the habit-tracker monorepo: Expo (SDK 56) + expo-router + TypeScript.

## What this is

A mobile habit tracker. Currently a single **static, read-only grid** (no persistence) — the plan is
to back it with a shared backend. It renders the same Habit × Entry model as the reMarkable client,
**transposed** for portrait: days are rows (vertical scroll), habits are columns, today's row
highlighted.

## Domain

Shared vocabulary lives in the monorepo-root [`CONTEXT.md`](../../CONTEXT.md) (Habit, Entry, X/O,
polarity, Unmarked). The TS model in `src/domain/` (`types.ts`, `dates.ts`, `habits.ts`) mirrors the
reMarkable client's shape — keep the `dateKey` format (`YYYY-MM-DD`) and the X/O entry semantics
aligned so a future backend speaks one shape.

## Layout

- `src/app/` — expo-router routes. One route today (`index.tsx`); `_layout.tsx` is a headerless `Stack`.
- `src/components/` — UI (e.g. `habit-grid.tsx`).
- `src/domain/` — model + date helpers, no UI.
- `@/*` path alias → `src/*` (see `tsconfig.json`).

## Conventions

- Styling is **barebones on purpose** — functionality first, visual design later.
- Local `.prettierrc` (2-space / single-quote) follows expo/RN convention instead of the repo-root
  4-space config.
- `pnpm typecheck` (tsc --noEmit) to check types; `pnpm start` to run the dev server.
