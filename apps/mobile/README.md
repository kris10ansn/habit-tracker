# Habit Tracker — mobile

> Part of the **habit-tracker** monorepo — this is the `apps/mobile/` client. The sibling reMarkable
> client lives in `apps/remarkable/`. Shared habit vocabulary is in the
> [root `CONTEXT.md`](../../CONTEXT.md).

The mobile client of the habit tracker: an [Expo](https://expo.dev) (SDK 56) app built with
expo-router and TypeScript, styled with [NativeWind](https://www.nativewind.dev) (Tailwind for
React Native).

It renders the same Habit × Entry model as the reMarkable client, **transposed** for portrait: days
are rows (vertical scroll), habits are columns, today's row highlighted.

```
June 2026
30 days · today is the 5th.

      Read   Exer  Medi  No-screens  Journal
  1    X      X            O           X
  2    X            O      X
  3    O      X
  4
 [5]  ← today's row highlighted
  …
```

## Status

Barebones on purpose — **functionality first, visual design later**. Today it's a single **static,
read-only grid** rendered from sample data ([`src/domain/habits.ts`](./src/domain/habits.ts)); there
is no persistence and no editing yet. The plan is to back it with a shared backend that owns the
canonical habits and syncs them to both clients.

## Run it

Install workspace deps once from the monorepo root (`pnpm install`), then from the root:

```sh
pnpm mobile:start      # start the expo dev server
pnpm mobile:android    # open on an Android emulator/device
pnpm mobile:ios        # open on an iOS simulator/device
pnpm mobile:web        # open in the browser
```

Or run scripts directly from this directory with `pnpm start` / `pnpm android` / `pnpm ios` /
`pnpm web`. The dev server prints options to open the app in a development build, a simulator, or
[Expo Go](https://expo.dev/go).

Checks:

```sh
pnpm typecheck    # tsc --noEmit
pnpm lint         # expo lint
```

## Layout

```
src/
├── app/          expo-router routes (file-based). index.tsx is the grid screen;
│                 _layout.tsx is a headerless Stack and imports global.css.
├── components/   UI (habit-grid.tsx)
└── domain/       model + date helpers, no UI (types.ts, dates.ts, habits.ts)
```

- `@/*` is a path alias for `src/*` (see `tsconfig.json`).
- The domain types mirror the reMarkable client's shape — same `YYYY-MM-DD` date keys and X/O entry
  semantics — so a future backend speaks one shape across clients.

## Styling

NativeWind only: style with `className` and Tailwind utilities, not `StyleSheet.create` or inline
`style`. Config lives at the app root (`tailwind.config.js`, `global.css`, `metro.config.js`,
`babel.config.js`, `nativewind-env.d.ts`). Third-party components need
`cssInterop(Component, { className: 'style' })` before they accept `className` (see
`src/app/index.tsx`); core RN components work out of the box.
