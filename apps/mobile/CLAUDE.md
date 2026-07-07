# CLAUDE.md — mobile app

@AGENTS.md

The `apps/mobile/` client of the habit-tracker monorepo: Expo (SDK 56) + expo-router + TypeScript,
styled with NativeWind (Tailwind for React Native).

## What this is

A mobile habit tracker with four tabs — **Today** (log), **Month** (the grid), **Habits** (edit
roster), **Sync**. Renders the same Habit × Entry model as the reMarkable client; the Month grid is
**transposed** for portrait (days as rows, habits as columns, today highlighted). **Marks and roster edits are
wired** to an in-memory store (`src/state/HabitsProvider.tsx`) — tapping a `HabitMark` on Today or
Month cycles its X/O state, and the Habits tab renames, flips polarity, and drag-to-reorders (drag
a row by its handle; see `components/habits/SortableHabitList.tsx`). The rest is affordances
only: add/delete/archive and sync don't act yet, and nothing persists across launches. The plan is
to back the store with a shared backend.

## Domain

Shared vocabulary lives in the monorepo-root [`CONTEXT.md`](../../CONTEXT.md) (Habit, Entry, X/O,
polarity, Unmarked). The TS model in `src/domain/` (`types.ts`, `dates.ts`, `habits.ts`, `marks.ts`)
mirrors the reMarkable client's shape — keep the `dateKey` format (`YYYY-MM-DD`) and the X/O entry
semantics aligned so a future backend speaks one shape. The X/O → display reading (`markView`) and
streak logic live in `marks.ts`, so components never re-derive the semantics.

## Layout

- `src/app/` — expo-router routes. `_layout.tsx` is the `Tabs` navigator (headerShown false), wraps
  the tree in `HabitsProvider`, and imports `global.css` (the app-wide stylesheet entrypoint — keep
  this import). Routes: `index` (Today), `month`, `habits`, `sync`.
- `src/components/` — UI grouped by feature: `ui/` holds reusable primitives (`Card`, `Button`,
  `Pill`, `Icon`, `IconButton`, `StatCard`, `TextField`, `AppScreen`, `ScreenHeader`, `SortableList`);
  `today/`, `month/`, `habits/`, `sync/` hold screen-specific pieces; `HabitMark.tsx` is the shared
  X/O chip. `SortableList` is the generic drag-to-reorder list (equal-height rows, id-keyed
  `onReorder`, `SortableListHandle` as the grab affordance) — `habits/SortableHabitList.tsx` is its
  habits binding.
- `src/domain/` — model + logic, no UI (the X/O tap cycle is `nextEntry` in `marks.ts`).
  `src/state/HabitsProvider.tsx` — the in-memory habits store: `useHabits()` returns the roster plus
  `toggleEntry`, `updateHabit`, and `reorderHabit`; screens read habits from here, not
  `DEFAULT_HABITS` directly. Habits carry a stable `id` — key lists on it, never on `name` (renames
  would remount) or the index (reorders would desync uncontrolled `TextInput`s).
  `src/theme/colors.ts` — raw palette for non-className APIs. `src/lib/cn.ts` — classname joiner for
  conditional classes.
- `@/*` path alias → `src/*` (see `tsconfig.json`).
- NativeWind config lives at the app root: `tailwind.config.js` (content globs + `nativewind/preset`
    - the design tokens), `global.css` (Tailwind directives), `metro.config.js` (`withNativeWind`),
      `babel.config.js` (`jsxImportSource: 'nativewind'`), and `nativewind-env.d.ts` (types).

## Conventions

- **Styling is NativeWind only** — use `className` with Tailwind utilities; do not use
  `StyleSheet.create` or inline `style` objects. **Exception:** React Navigation options that take
  color/style values (the tab bar in `_layout.tsx`) and `placeholderTextColor` — pull those from
  `src/theme/colors.ts`. Color values have a single source in `src/theme/palette.js`, consumed by
  both `tailwind.config.js` (shaped into the color scale) and `colors.ts` (re-exported raw); radii
  like `rounded-card`/`rounded-field` are tokens in `tailwind.config.js`.
- **Reuse the primitives.** Build screens from `components/ui/*` (`Card`, `Button`, `AppScreen`, …)
  and compose feature pieces; don't re-style raw `View`s ad hoc. Use `cn()` for conditional classes.
- **Icons are Material icons** from `@expo/vector-icons`, wrapped by the `Icon` primitive
  (`components/ui/Icon.tsx`) — pass a Material `name` and a `text-*` class for the tint (it registers
  `cssInterop` so `className` drives color); `size` is a number. `IconButton` takes an `icon` name;
  the tab bar passes React Navigation's resolved `color`. Don't render raw text glyphs for icons.
- Third-party components (e.g. `SafeAreaView` from `react-native-safe-area-context`, `MaterialIcons`)
  don't accept `className` until registered with `cssInterop(Component, { className: 'style' })` —
  registered in `src/components/ui/AppScreen.tsx` and `src/components/ui/Icon.tsx`. Core RN components (`View`, `Text`, `ScrollView`, `TextInput`,
  …) work out of the box; `ScrollView` also takes `contentContainerClassName`.
- `babel-preset-expo` auto-configures the reanimated 4 babel plugin on SDK 56, so **never** add
  `react-native-reanimated/plugin` (or `react-native-worklets/plugin`) to `babel.config.js` — it
  duplicates the plugin and errors.
- **File names match the export's casing.** A file whose main export is capitalized (a React
  component, e.g. `AppScreen`, `HabitMark`) is `PascalCase.tsx`; a file exporting lowercase
  identifiers (`marks.ts`, `cn.ts`) stays camelCase/lowercase. **Exception:** `src/app/` routes keep
  expo-router's framework-dictated lowercase names (the filename is the URL route; `index`/`_layout`
  are special) even though they default-export a capitalized screen component.
- Local `.prettierrc.json` (4-space / double-quote, plus `prettier-plugin-organize-imports` and
  `prettier-plugin-tailwindcss` for class sorting) overrides the repo-root config.
- `pnpm typecheck` (tsc --noEmit) to check types; `pnpm start` to run the dev server.
