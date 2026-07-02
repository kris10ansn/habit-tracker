# Habit Tracker — mobile

> Part of the **habit-tracker** monorepo — this is the `apps/mobile/` client. The sibling reMarkable
> client lives in `apps/remarkable/`. Shared habit vocabulary is in the
> [root `CONTEXT.md`](../../CONTEXT.md).

The mobile client of the habit tracker: an [Expo](https://expo.dev) (SDK 56) app built with
expo-router and TypeScript, styled with [NativeWind](https://www.nativewind.dev) (Tailwind for
React Native).

It renders the same Habit × Entry model as the reMarkable client over a mobile-native, tabbed UI:

- **Today** — the primary daily surface: one card per habit with today's mark and its streak.
- **Month** — the whole grid at review scale, **transposed** for portrait: days are rows (vertical
  scroll), habits are columns, today's row highlighted.
- **Habits** — manage the roster: rename, reorder, set polarity, add, delete.
- **Sync** — point the app at a backend, or stay standalone with an empty Server URL.

## Status

**Design implemented, functionality pending.** The four screens are built from a small design system
and rendered from sample data ([`src/domain/habits.ts`](./src/domain/habits.ts)); there is no
persistence, editing, or real sync yet — controls are affordances only. The plan is to back it with a
shared backend that owns the canonical habits and syncs them to both clients.

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
pnpm lint         # expo lint (config in eslint.config.js)
```

## Layout

```
src/
├── app/          expo-router routes (file-based). _layout.tsx is the Tabs navigator
│                 (imports global.css); index=Today, month, habits, sync.
├── components/   UI, grouped by feature — ui/ (primitives: Card, Button, Pill,
│                 AppScreen, …), today/, month/, habits/, sync/, plus habit-mark.tsx.
├── domain/       model + logic, no UI (types.ts, dates.ts, habits.ts, marks.ts).
├── theme/        colors.ts — raw palette for non-className APIs (the tab bar).
└── lib/          cn.ts — classname joiner.
```

- `@/*` is a path alias for `src/*` (see `tsconfig.json`).
- The domain types mirror the reMarkable client's shape — same `YYYY-MM-DD` date keys and X/O entry
  semantics — so a future backend speaks one shape across clients. The X/O → display reading lives in
  `domain/marks.ts` (`markView`) so components stay presentational.

## Styling

NativeWind only: style with `className` and Tailwind utilities, not `StyleSheet.create` or inline
`style`. Design tokens (colors, radii) live in `tailwind.config.js`; `src/theme/colors.ts` mirrors
the palette for the few React Navigation APIs that take color values rather than classes — keep the
two in sync. Config lives at the app root (`tailwind.config.js`, `global.css`, `metro.config.js`,
`babel.config.js`, `nativewind-env.d.ts`). Third-party components need
`cssInterop(Component, { className: 'style' })` before they accept `className` (registered in
`src/components/ui/app-screen.tsx` for `SafeAreaView`); core RN components work out of the box.
