# Habit Tracker — mobile

> Part of the **habit-tracker** monorepo — this is the `apps/mobile/` client. Its contract partner is
> the backend in [`apps/backend/`](../backend/), which owns the canonical records and Sync;
> `apps/remarkable/` is an independent peer client, not a reference. Shared habit vocabulary is in
> the [root `CONTEXT.md`](../../CONTEXT.md), the sync terms in the
> [backend glossary](../backend/CONTEXT.md).

The mobile client of the habit tracker: an [Expo](https://expo.dev) (SDK 57) app built with
expo-router and TypeScript, styled with [NativeWind](https://www.nativewind.dev) (Tailwind for
React Native).

It renders the Habit × Entry model in the backend's shape over a mobile-native, tabbed UI:

- **Today** — the primary daily surface: one card per habit with today's mark and its streak.
- **Month** — the whole grid at review scale, **transposed** for portrait: days are rows (vertical
  scroll), habits are columns, today's row highlighted.
- **Habits** — manage the roster: rename, reorder, set polarity.
- **Sync** — point the app at a backend, sign in, and manage linked devices, or stay standalone with
  an empty Server URL.

## Status

**Persistent, editable, and synced.** Habits and entries live in on-device SQLite (`expo-sqlite` +
Drizzle) read through TanStack Query, so marking a day, renaming a habit, flipping its polarity,
reordering the roster, and adding or deleting habits all persist across restarts. The Sync screen
stores a **Server URL** (blank = standalone) and offers a manual **Sync now**; the Month screen also
passes whichever month is being viewed when you pull to refresh, while Today and Habits can also be
refreshed to sync. A fresh install starts empty: add habits locally or pull them from your account
with **Sync now**. Older history is fetched for the month you view and refresh. The backend at
[`apps/backend/`](../backend/) owns the merge (last-write-wins on
`editedAt`) — this client submits its state and accepts the result rather than resolving conflicts
itself. From **Sync → Linked devices → Link a device**, scan a pairing QR code with the in-app
camera or enter its six-character code manually, review the requesting device, and approve it.

## Daily use

1. Open **Habits** to add a habit. Choose positive for something you want to do, or negative for
   something you want to avoid. Rename in place, drag the handle to reorder, or delete with confirmation.
2. In **Today**, tap a habit's mark to cycle it. Positive habits cycle **Not yet → Done → Missed →
   Not yet**. Negative habits start **Clean**; tap to record **Slipped**, and tap again to clear it.
3. Open **Month** to review or correct past entries. Navigate with the month controls; future days
   are view-only. The grid scrolls vertically through days and horizontally through habits.

Changes save locally. Deleting a habit also removes its marks from view and propagates to other
devices when synced. Habits marked private on reMarkable remain visible here; mobile currently
has no working privacy toggle or hide-private setting.

## Connect and sync

1. Set up the [backend](../backend/README.md#run-it), or get its base URL from its administrator.
2. Enter that URL in **Sync → Server URL**, including `http://` or `https://`, and tap **Save**.
   Use the server base address without `/api` or `/api/sync`.
3. Create an account or sign in. Passwords require at least 10 characters; signups after the first
   server account need an invite from an administrator.
4. Tap **Sync now**, or pull to refresh Today, Month, or Habits. To retrieve older history, open
   that month and pull to refresh. Saving an address or signing in alone does not run a sync.

To connect a tablet, request a code in its Settings, then open **Sync → Linked devices → Link a
device** on mobile. Scan or enter the code, review the device name, and approve. Both devices must
use the same backend; keep the tablet's Settings open until it receives its token. Codes expire
after five minutes. **Linked devices** also lets you revoke sessions.

Clear the Server URL and tap **Save** to use standalone mode. Logging out or revoking a session
does not erase the local SQLite data. Local habits are not separated by account, so signing into
another account and syncing can upload the existing local roster to it. There is currently no
in-app export, backup, or restore flow; keep unsynced data before clearing app storage or uninstalling.

## Run it

Use Node.js 22.13 or newer. After an SDK upgrade, rebuild any installed native development or preview app before testing.

Install workspace deps once from the monorepo root (`pnpm install`), then from the root:

```sh
pnpm mobile:start      # start the expo dev server
pnpm mobile:android    # build and run on an Android emulator/device (Android SDK + JDK required)
pnpm mobile:ios        # build and run on iOS (macOS + Xcode required; currently unverified)
```

Or run scripts directly from this directory with `pnpm start` / `pnpm android` / `pnpm ios`.
There is deliberately no web target. The dev server prints options to open the app in a development build, a simulator, or
[Expo Go](https://expo.dev/go).

QR pairing opens the scanner automatically and requests camera access when needed. If access is
denied, the scanner shows an action to allow it or open system settings. Manual code entry remains
available below it. Scanning needs a physical Android or iOS device.

### Android build profiles

Run these from the repository root with EAS CLI installed and configured for your Expo account:

```sh
pnpm mobile:build:android                 # EAS cloud build, production profile
pnpm mobile:build:android:preview         # EAS cloud build, internal distribution
pnpm mobile:build:android:preview:local   # local internal build; Android SDK + JDK required
```

Profiles live in [`eas.json`](eas.json). The `development` profile includes the development client
and can be selected with `pnpm mobile:build:android --profile development`. Rebuild installed
native apps after SDK or native dependency changes.

For isolated fictional data and README captures, use the [screenshot test workflow](../../tools/readme-screenshots/README.md).

### Troubleshooting

| Symptom                                 | What to check                                                                                                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server URL change has no effect         | Tap **Save**; dismissing the keyboard does not apply the address.                                                                                                                         |
| Cannot reach a local API                | Use `http://10.0.2.2:5137` on a local Android emulator, or the computer's LAN IP on a phone. Ensure the API is running and the network/firewall allows port 5137.                         |
| Signed out after a sync attempt         | The session may have been revoked or the server changed. Sign in to the configured server again. Local habits remain available.                                                           |
| Old month looks empty after syncing     | Navigate to that month and pull to refresh; sync does not download every remote month automatically.                                                                                      |
| Pairing code expired or cannot be found | Request a new code, check both server addresses, and complete approval within five minutes.                                                                                               |
| Server rejects a future edit time       | Check the device and server clocks. The backend refuses edits over five minutes ahead of its clock; previously recorded future timestamps may require waiting until the clock catches up. |

### Checks

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
│                 AppScreen, SortableList, …), today/, month/, habits/, sync/,
│                 plus HabitMark.tsx and AppProviders.tsx (query client + DatabaseGate).
├── db/           SQLite via Drizzle — schema.ts, drizzle/ (generated migrations),
│                 client.ts, migrations.ts, repo/ (the only DB access, incl. sync.ts).
├── state/        queries/ — TanStack Query hooks + mutations, incl. sync.ts; the seam
│                 screens read through. Screens never touch SQLite directly.
├── domain/       model + logic, no UI (types.ts, dates.ts, entries.ts, roster.ts, marks.ts).
├── api/          generated backend clients, schemas, and types; hand-written fetch transport.
├── auth/         session storage and pairing helpers.
├── testMode/     isolated fictional data, clock, network, and camera adapters for captures.
├── theme/        palette.js — single source of color values; colors.ts re-exports
│                 it raw for non-className APIs (the tab bar).
└── lib/          cn.ts — classname joiner; useUpdateEffect.ts.
```

- `@/*` is a path alias for `src/*` (see `tsconfig.json`).
- The domain types mirror the **backend's** shape — `Outcome`/`Polarity`/`Position`, `YYYY-MM-DD`
  date keys, UUID ids — so mobile↔backend sync is a near-identity map. X/O is a _display_ reading,
  not storage: the mapping lives in `domain/marks.ts` (`markView`) so components stay presentational.
- Edit the schema, then run `pnpm db:generate` to regenerate the Drizzle migrations (they're
  committed, not ignored).
- After a backend contract change, run `pnpm backend:build` then `pnpm mobile:api:generate` from
  the root. Commit both the OpenAPI document and generated client; do not edit `src/api/gen/` by hand.

## Styling

NativeWind only: style with `className` and Tailwind utilities, not `StyleSheet.create` or inline
`style`. Color values have a single source in `src/theme/palette.js`, consumed by both
`tailwind.config.js` (shaped into the color scale) and `src/theme/colors.ts` (re-exported raw for the
few React Navigation APIs that take color values rather than classes); radii are tokens in
`tailwind.config.js`. Config lives at the app root (`tailwind.config.js`, `global.css`, `metro.config.js`,
`babel.config.js`, `nativewind-env.d.ts`). Third-party components need
`cssInterop(Component, { className: 'style' })` before they accept `className` (registered in
`src/components/ui/AppScreen.tsx` for `SafeAreaView` and `src/components/ui/Icon.tsx` for
`MaterialIcons`); core RN components work out of the box.
