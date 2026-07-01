# reMarkable Client — Device Context

Terms unique to the reMarkable 1 client — a pure-QML scene loaded inside xochitl via
XOVI + rm-appload. The shared habit vocabulary (Habit, Polarity, Entry, X/O marks, Unmarked,
Default habits) lives in the [root glossary](../../CONTEXT.md); see
[CONTEXT-MAP.md](../../CONTEXT-MAP.md). This file covers only what's specific to running on the
device: the suspend image, settings, and edit mode.

Presentation note: this client lays habits as **rows** and days-of-the-**viewed month** as
**columns** (landscape). Only when the viewed month is the current month is today's column
highlighted; other months show no highlight. A negative habit's name carries a `(−)` suffix and
its future days render muted.

## Language

**Suspend image**:
The full-screen image xochitl shows while the device sleeps. The app overwrites it with the
current habit grid so the habits are the first thing the user sees on waking the device.
_Avoid_: sleep screen, sleep image, lock screen, wallpaper, suspended.png.

**Suspend visibility**:
Per-habit toggle (the `Z` control) controlling whether a habit's row appears in the suspend
image. A hidden habit still shows in the app.
_Avoid_: hideFromSleep (code field name), sleep-screen visibility.

**Suspend-image writing**:
The app-wide setting for whether the app overwrites the suspend image at all. Opt-in: off by
default, toggled on the Settings page. Enabling takes a suspend-image backup then starts
drawing the grid; disabling restores the backup. While off, the `Z` controls are hidden.
_Avoid_: sleep-screen toggle, suspend mode.

**Suspend-image backup**:
The copy of the original suspend image (`suspended.png.bak`) taken when the user enables
suspend-image writing, and copied back when they disable it. The user's recovery path to the
stock image.
_Avoid_: marker, restore point.

**Settings**:
The app-wide preferences page, reached from the Settings button and left via Back/Done.
Currently holds the single suspend-image writing toggle. Changes are staged and applied on Done.
_Avoid_: options, preferences pane, config screen.

**Edit mode**:
The state, toggled by Edit/Done, in which rows become editable — reorder, rename, delete,
toggle polarity, toggle suspend visibility — and an empty add-row appears at the bottom.

**Current month**:
The real calendar month (`new Date()`). It alone highlights today, drives the suspend image, and
is where the grid opens. Distinct from the viewed month.
_Avoid_: this month, present month.

**Viewed month**:
The month whose entries the grid currently shows — the current month by default, moved by the
header `‹` / `›` arrows. Its entries are loaded into the one in-memory model and its file is the
sync unit; editing works on any viewed month. The **Today** button (shown only off-current)
returns to the current month.
_Avoid_: selected month, shown month, browsed month (in code/UI copy).

**Month navigation**:
Stepping the viewed month backward/forward with the header arrows. Unbounded in both directions;
a month with no data shows an empty grid and writes no file until a box is toggled.
_Avoid_: month switcher, month picker, paging.

### Storage

**Data directory**:
The `data/` subdirectory of the app dir holding all habit persistence (the roster file and the
month files). The deploy creates it; the app cannot, so a missing data directory surfaces as a
visible save failure, never silent loss.
_Avoid_: data folder, storage dir.

**Roster**:
The ordered list of habits with their config — id, name, polarity, suspend visibility — and
nothing about their entries. Array order is display order.
_Avoid_: habit list, config.

**Roster file**:
`data/roster.json`, the `{ "habits": [...] }` envelope that persists the roster.
_Avoid_: habits.json (the legacy single-file name).

**Month file**:
`data/YYYY-MM.json`, persisting one calendar month's entries keyed by habit id. Exactly one
month's file — the viewed month — is loaded at a time; navigating re-points to another.
_Avoid_: entries file, day file.

### Sync

**Server URL**:
The user-entered address of the backend this client syncs with, set on the Settings page and stored
in `settings.json`. Empty means **standalone** — the app runs fully local and makes no sync attempts.
The shared Sync / Tombstone / Edit-time vocabulary lives in the
[backend glossary](../../apps/backend/CONTEXT.md).
_Avoid_: host, endpoint, API URL, server address.

**Sync status**:
The ambient status line shown beneath the suspend status, reporting last-sync / offline state. Quiet
by design: normal offline is silent here, and only genuine misconfiguration (malformed Server URL,
server rejection) is raised loudly as a modal.
_Avoid_: connection indicator, sync banner, online status.
