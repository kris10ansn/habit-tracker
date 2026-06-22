# reMarkable Client — Device Context

Terms unique to the reMarkable 1 client — a pure-QML scene loaded inside xochitl via
XOVI + rm-appload. The shared habit vocabulary (Habit, Polarity, Entry, X/O marks, Unmarked,
Default habits) lives in the [root glossary](../../CONTEXT.md); see
[CONTEXT-MAP.md](../../CONTEXT-MAP.md). This file covers only what's specific to running on the
device: the suspend image, settings, and edit mode.

Presentation note: this client lays habits as **rows** and days-of-the-current-month as
**columns** (landscape), with today's column highlighted. A negative habit's name carries a
`(−)` suffix and its future days render muted.

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
