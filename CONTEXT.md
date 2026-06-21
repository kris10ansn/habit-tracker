# reMarkable Habit Tracker

A QML habit tracker that runs inside xochitl (via XOVI + rm-appload) on a reMarkable 1.
It renders a grid of habits × days of the current month and mirrors that grid onto the
device's **suspend image**. This file is the project's glossary — the canonical names for
domain concepts. Use these terms (and only these) across code, comments, README, and ADRs.

## Language

**Habit**:
A behaviour the user tracks day-by-day; one row of the grid. Has a name, a polarity
(positive/negative), suspend visibility, and a set of entries.
_Avoid_: task, goal, item.

**Polarity**:
Whether a habit is positive or negative. Determines what the entry states mean.

**Positive habit**:
A habit the user wants to perform. The default polarity. An unmarked day means nothing
recorded yet.

**Negative habit**:
A habit the user wants to avoid. Every day is implicitly a success ("didn't slip") until
marked otherwise; the name carries a `(−)` suffix and future days render muted.
_Avoid_: bad habit.

**Entry**:
A habit's recorded state for a single day, keyed by date. Absence of an entry for a day is
the unmarked state — entries only exist for days the user has marked.
_Avoid_: mark, check, log, record.

**X mark** (stored `"x"`):
An entry state. On a positive habit it means **done**. It is not a stored value on a
negative habit — instead a negative habit's unmarked day is *displayed* as an X meaning
"stayed clean today".

**O mark** (stored `"o"`):
An entry state. On a positive habit it means **explicitly not done**. On a negative habit
it means **slipped up** (the only state the user actively records).

**Unmarked** (no stored entry):
The default entry state. Positive habits cycle Unmarked → X → O → Unmarked. Negative habits
cycle Unmarked (shown as X) → O → Unmarked.

**Suspend image**:
The full-screen image xochitl shows while the device sleeps. The app overwrites it with the
current habit grid so the habits are the first thing the user sees on waking the device.
_Avoid_: sleep screen, sleep image, lock screen, wallpaper, suspended.png.

**Suspend visibility**:
Per-habit toggle (the `Z` control) controlling whether a habit's row appears in the suspend
image. A hidden habit still shows in the app.
_Avoid_: hideFromSleep (code field name), sleep-screen visibility.

**Edit mode**:
The state, toggled by Edit/Done, in which rows become editable — reorder, rename, delete,
toggle polarity, toggle suspend visibility — and an empty add-row appears at the bottom.

**Default habits**:
The seed list used the first time the app runs (no saved data yet). Defined in
`src/js/habits.js`.
