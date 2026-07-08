# CLAUDE.md — mobile app

@AGENTS.md

The `apps/mobile/` client of the habit-tracker monorepo: Expo (SDK 56) + expo-router + TypeScript,
styled with NativeWind (Tailwind for React Native).

## What this is

A mobile habit tracker with four tabs — **Today** (log), **Month** (the grid), **Habits** (edit
roster), **Sync**. Renders the same Habit × Entry model as the reMarkable client; the Month grid is
**transposed** for portrait (days as rows, habits as columns, today highlighted) and **navigable to
any month** (past editable, future view-only). Data **persists in SQLite** (`expo-sqlite`) storing
the backend's shape (Outcome/Polarity/Position/`updatedAt`/`deleted` tombstones, UUID ids), read
through **TanStack Query** hooks (`src/state/queries.ts`) over a thin repo (`src/db/repo.ts`).
Tapping a `HabitMark` on Today or Month cycles its state; the Habits tab renames, flips polarity,
and drag-to-reorders (drag a row by its handle — the generic `components/ui/SortableList` with an
inline `HabitRow` in `app/habits.tsx`). Still affordance-only: add/delete/archive, and Sync — the
data layer is shaped for the backend but the sync *engine* is not built yet. See
[`docs/adr/0001-mobile-sqlite-persistence-sync-shaped.md`](./docs/adr/0001-mobile-sqlite-persistence-sync-shaped.md).

## Domain

Shared vocabulary lives in the monorepo-root [`CONTEXT.md`](../../CONTEXT.md) (Habit, Entry, X/O,
polarity, Unmarked). The TS model in `src/domain/` mirrors the **backend's** shape so mobile↔backend
sync is a near-identity map (see `docs/adr/0001`): `types.ts` holds flat `Habit`/`Entry` rows storing
`Outcome`/`Polarity`; `marks.ts` maps Outcome → the X/O display reading (`markView`) and the tap
cycle (`nextAction`, `isSuccess`) — components never re-derive the semantics. `dates.ts` owns the
`dateKey` (`YYYY-MM-DD`) / `monthKey` (`YYYY-MM`) formats plus month math; `entries.ts` is the
per-month cell lookup. The look-back **streak** query lives in `db/repo.ts` (`getStreaks`), since it
crosses month partitions.

## Layout

- `src/app/` — expo-router routes. `_layout.tsx` is the `Tabs` navigator (headerShown false), wraps
  the tree in `HabitsProvider`, and imports `global.css` (the app-wide stylesheet entrypoint — keep
  this import). Routes: `index` (Today), `month`, `habits`, `sync`.
- `src/components/` — UI grouped by feature: `ui/` holds reusable primitives (`Card`, `Button`,
  `Pill`, `Icon`, `IconButton`, `StatCard`, `TextField`, `AppScreen`, `ScreenHeader`, `SortableList`);
  `today/`, `month/`, `habits/`, `sync/` hold screen-specific pieces; `HabitMark.tsx` is the shared
  state chip. `SortableList` is the generic drag-to-reorder list (equal-height rows, id-keyed
  `onReorder`, `SortableListHandle` as the grab affordance); the habits binding is an inline
  `HabitRow` in `app/habits.tsx` (there is no `SortableHabitList` component).
- `src/domain/` — model + logic, no UI (the tap cycle is `nextAction` in `marks.ts`).
- `src/db/` — SQLite via **Drizzle**: `schema.ts` (Drizzle table defs — `enum`/`boolean` column
  modes make results match the domain types), `drizzle/` (drizzle-kit–generated migrations —
  regenerate with `pnpm db:generate` after editing the schema; committed, not ignored), `client.ts`
  (`useDatabase` — the typed Drizzle handle), `migrations.ts` (wraps the generated bundle), `seed.ts`
  (`seedIfEmpty` — default habits + demo entries), `repo.ts` (the only DB access — Drizzle query
  builder, reads return alive rows, writes stamp `updatedAt` and soft-delete tombstones). Migrations
  run at startup via `useMigrations` in `_layout.tsx`'s `DatabaseGate`. Build glue: `babel.config.js`
  inlines `.sql`, `metro.config.js` adds the `sql` sourceExt (both required by Drizzle's expo
  migrator).
- `src/state/queries.ts` — the data seam: TanStack Query hooks `useHabits`, `useMonthEntries`,
  `useStreaks`, and the `useToggleEntry`/`useUpdateHabit`/`useReorderHabit` mutations (optimistic +
  invalidating). Screens read through these, never SQLite directly. Habits carry a stable `id` — key
  lists on it, never on `name` (renames would remount) or the index (reorders would desync
  uncontrolled `TextInput`s).
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
