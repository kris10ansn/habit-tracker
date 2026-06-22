# CLAUDE.md — mobile app

@AGENTS.md

The `apps/mobile/` client of the habit-tracker monorepo: Expo (SDK 56) + expo-router + TypeScript,
styled with NativeWind (Tailwind for React Native).

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

- `src/app/` — expo-router routes. One route today (`index.tsx`); `_layout.tsx` is a headerless
  `Stack` and imports `global.css` (the app-wide stylesheet entrypoint — keep this import).
- `src/components/` — UI (e.g. `habit-grid.tsx`).
- `src/domain/` — model + date helpers, no UI.
- `@/*` path alias → `src/*` (see `tsconfig.json`).
- NativeWind config lives at the app root: `tailwind.config.js` (content globs + `nativewind/preset`),
  `global.css` (Tailwind directives), `metro.config.js` (`withNativeWind`), `babel.config.js`
  (`jsxImportSource: 'nativewind'`), and `nativewind-env.d.ts` (types).

## Conventions

- **Styling is NativeWind only** — use `className` with Tailwind utilities; do not use
  `StyleSheet.create` or inline `style` objects. Styling is **barebones on purpose** (functionality
  first, visual design later), so plain utility classes are fine — no design system yet.
- Third-party components (e.g. `SafeAreaView` from `react-native-safe-area-context`) don't accept
  `className` until registered with `cssInterop(Component, { className: 'style' })` — see
  `src/app/index.tsx`. Core RN components (`View`, `Text`, `ScrollView`, …) work out of the box;
  `ScrollView` also takes `contentContainerClassName`.
- `babel-preset-expo` auto-configures the reanimated 4 babel plugin on SDK 56, so **never** add
  `react-native-reanimated/plugin` (or `react-native-worklets/plugin`) to `babel.config.js` — it
  duplicates the plugin and errors.
- Local `.prettierrc` (2-space / single-quote, plus `prettier-plugin-tailwindcss` for class sorting)
  follows expo/RN convention instead of the repo-root 4-space config.
- `pnpm typecheck` (tsc --noEmit) to check types; `pnpm start` to run the dev server.
