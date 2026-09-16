# Idle-screen design prototype

Throwaway design exploration, not part of the app build. No production rendering, settings, or
system-image writing has changed. The user selected A (Quiet ledger); state-icon treatments
are now being explored before implementation.

Question: how can the same public habit snapshot feel more like a printed page while making
sleep, power off, and an empty battery unmistakable?

## Preview

From the repository root:

```sh
python3 apps/remarkable/tools/screen-design-prototype/serve.py
```

Open <http://localhost:8765/?variant=A&state=sleep>. Use the bottom controls or left/right arrow
keys to compare designs. `variant=A|B|C` and `state=sleep|off|empty` are reload-stable URL parameters.
The controls are outside the tablet image. The prototype is not listed in `application.qrc` and
cannot be included in the production build. Stop the local server with Ctrl-C.

The drawing uses the existing landscape aspect ratio, 1872 × 1404. Actual device PNGs would
retain the current renderer's clockwise rotation into 1404 × 1872 files. Browser fonts are design
approximations; a chosen serif face needs checking in Qt and on the tablet.

## Concepts

| Concept           | Layout                                                                                            | Tradeoff                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| A · Quiet ledger  | Large editorial month heading, one full-month grid, thin row rules, state and action in a footer. | Best balance of calm and scanning. The state has less prominence than C.                    |
| B · Open notebook | Two sections, days 1–15 and 16–30. State and action at top right.                                 | More separation between days; every habit name repeats. More rows will require compression. |
| C · State panel   | Dedicated left panel for state and action; individual habit strips on the right.                  | Clearest device status; repeated date labels are smaller.                                   |

Recommendation: start with A. Keep the explicit state/action pairing in every design and the
stronger battery-empty treatment. A's state position stays fixed across all three states.

All concepts use the exact five public habits and 30 X marks visible in
[`remarkable-suspend.png`](../../../../docs/assets/screenshots/remarkable-suspend.png).
They preserve all 30 days, habit order, and the highlighted ninth day. The current renderer
intentionally draws X only: a failure appears blank, as does an unmarked positive habit.
Negative habits keep their existing implied-success behavior. Private habits remain excluded.
No progress counts, scores, or streaks have been invented.

This is deliberately a fixed September 9 fixture. Production implementation must also handle
28/29/31-day months, long names, zero public habits, and larger rosters. Dense rosters must fit
without silently dropping habits or covering the state area; settle their minimum readable size
and overflow behavior before promoting a design.

## State copy

The second iteration, `icon-prototype.html`, keeps A's header, grid, and state copy and compares
three icon treatments: A1 simple line, A2 outlined circular badge, and A3 solid black badge.
Sleep uses a crescent moon, power off uses the power symbol, and battery empty uses an empty
battery outline without a lightning bolt. State words and recovery instructions remain visible.
The conversation preview also offers moon-and-stars or bed alternatives and adjustable icon stroke
through the design controls. Icons are supplied by the visualization host's Lucide library.

This file is a visualization fragment, not a standalone browser document. The original local
preview command above still serves the first layout exploration. For icon-preview development
in this Codex installation:

```sh
python3 ~/.codex/plugins/cache/openai-bundled/visualize/1.0.37/skills/visualize/scripts/render.py \
  apps/remarkable/tools/screen-design-prototype/icon-prototype.html --serve
```

All nine icon-treatment/state combinations were checked in the visualization renderer: the
expected icon appeared at the intended size, all 30 habit marks remained, and the browser
reported no errors or warnings. Production Qt/e-ink verification is still outstanding.

| Target        | State         | Instruction           |
| ------------- | ------------- | --------------------- |
| Suspend       | Sleeping      | Press power to wake   |
| Power off     | Powered off   | Hold power to turn on |
| Battery empty | Battery empty | Connect to power      |

Use explicit words, not an icon alone. Never say “charging” merely because the battery-empty
image is showing: a static image cannot know whether a charger is connected. Do not show a
live-looking clock or battery percentage. Label the data “Snapshot · 9 September 2026” and call
the highlight the snapshot day, rather than asserting that it is still today.

## Proposed implementation after choosing a design

The app currently writes only `/usr/share/remarkable/suspended.png` through
[`SuspendCanvas.qml`](../../src/components/SuspendCanvas.qml). Its
[`SuspendDraw.js`](../../src/js/SuspendDraw.js) renderer is also consumed by the host
suspend-writer tool.

1. Add a render-state argument to the shared renderer and prepare three images from the same
   captured public-habit snapshot while the app is running. Do not depend on executing application
   code at the moment the battery is depleted. The system selects the relevant prewritten image.
2. Expected targets in `/usr/share/remarkable/` are `suspended.png`, `poweroff.png`, and
   `batteryempty.png`. These names and meanings are documented by
   [rM-Wallpaper-Manager](https://github.com/ambercaravalho/rM-Wallpaper-Manager#installation).
   Actual availability, orientation, caching, and activation must be confirmed on the user's rM1
   firmware before enabling new targets; no device verification was performed for this prototype.
3. Keep the existing suspend opt-in. Add separate power-off and battery-empty choices, initially
   off. An existing enabled suspend setting should not silently opt the user into replacing more
   system images. Read the current settings shape before deciding whether new fields require a
   one-shot migration under the repository's storage rules.
4. Preserve ADR 0001's recoverability for each target: verified backup before the first replacement,
   retain that original while enabled, restore on disable, and keep recovery possible after partial
   failure. Back up all newly selected targets successfully before writing any of them. Report
   failures by target; never replace an original backup with an already-customized image on retry.
5. Render/save targets in a controlled sequence using a captured snapshot. Track successful render
   signatures per target, including layout version and state, so a changed footer or a failed write
   is not incorrectly skipped. Preserve the current-month-only gates and pending-render cancellation.
6. Apply private filtering to every image regardless of the main grid's reveal setting. All three
   images remain snapshots from the last successful refresh; none updates while the device is off.
7. Extend the host tool and its smoke check to cover each state and output dimensions. Verify the
   same habit projection across targets, private filtering, current-month gating, failure/retry,
   backup/restore, and unchanged data when only the target state changes. Update settings copy,
   the user guide, and the relevant domain/decision docs when the real behavior changes.

No device commands, system-image writes, or production changes are part of this exploration.
After the user selects a design, retain this exploration on a throwaway branch and record the
choice on the implementation issue before removing the prototype from the implementation branch.

## Verification

Visually inspected all three layouts in a browser. Exercised all nine layout/state combinations:
each retained 30 X marks, excluded the private habit, and had no text outside the image bounds.
The next-design control updated the URL, and the browser reported no errors or warnings.
This verifies the fixed browser mockups, not Qt rendering or behavior on an actual e-ink display.
