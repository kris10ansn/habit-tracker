# Mobile app — design demo

`demo.html` is a self-contained, interactive web mock of a redesigned mobile client. Open it in any
browser (or `python3 -m http.server` in this dir and visit `/demo.html`). No build, no backend — all
state lives in memory and resets on reload.

It is a **design exploration**, not shipping code. It does not resemble the reMarkable client; it
takes the same shared domain (Habit / Entry / X-O / polarity) and gives it a mobile-native shape.

## The three required capabilities

- **Log habits** — the _Today_ tab is the primary daily surface: one card per habit with a big tap
  target that cycles the mark. The _Month_ tab is the same thing at review scale — a tappable grid.
- **Edit habits** — the _Habits_ tab: inline rename, reorder (▲/▼), a Positive/Negative polarity
  toggle, delete, and an add-row at the bottom.
- **Sync** — the _Sync_ tab: server-URL field, live status line, "Sync now", and the standalone
  (empty URL) state, matching the planned last-write-wins + tombstones model.

## Design decisions

- **Today-first, not grid-first.** On the reMarkable the month grid is the whole app. On a phone the
  daily action is "log today," so that gets its own focused screen; the grid becomes a review view.
- **Bottom tab bar** (Today · Month · Habits · Sync) instead of the device's edit-mode/settings
  buttons — the standard mobile navigation idiom.
- **Marks read as meaning, not letters.** Domain values are still `x`/`o`, but the UI shows a green
  ✓ / red ✕ with color and soft fills, and spells out the polarity-specific reading:
  positive → Done / Missed / Not-yet; negative → Clean (implicit) / Slipped. Future days on a
  negative habit render muted (as in the current grid), because "didn't slip" hasn't happened yet.
- **Portrait grid stays days-as-rows, habits-as-columns**, consistent with the current mobile
  transpose — but tappable and with weekday labels and a highlighted today row.
- **Calm, paper-adjacent palette** with a single indigo accent — a light nod to the e-ink sibling
  without inheriting its constraints.

## Not modelled

Persistence, real network sync, and drag-to-reorder gestures (reorder uses buttons here). The mark
cycle, polarity, streaks, month navigation, and add/rename/delete are all live.
