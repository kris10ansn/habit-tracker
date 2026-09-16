# Adaptive reMarkable layout — throwaway prototype

Design question: can the selected **B · Compact toolbar** layout give small rosters generous
spacing, fit eleven habits, and fall back to the tablet's existing page-scroll behavior?

Run from the repository root:

```sh
pnpm remarkable:demo
```

Open <http://127.0.0.1:8768>. No install, build, backend, device, or internet connection is needed.
The local server binds only to loopback and serves an allowlist of five files. Stop with Ctrl+C.
Alternatively run `python3 apps/remarkable/prototypes/adaptive-layout/serve.py --port 8768`.

## Review

- Start with eleven sample habits. Try the 5/11/20/35-habit controls outside the tablet.
- Mark entries: positive habits cycle blank → X → O → blank; negative habits toggle a failure,
  with implicit X only on dates up to the demo's fixed today (16 September 2026).
- Browse months, return to Today, and move seven days with the horizontal arrows.
- Edit names, reorder, add, delete with confirmation, and change polarity or privacy.
- Settings stage power-image, private-habit, and server changes until Done. Back prompts before
  discarding edits. Private habits stay hidden unless Show private habits is enabled.
- Settings → Disconnect → Connect shows QR/manual pairing. The outer Screen selector also jumps
  directly to QR pairing. The QR encodes `H7K9Q2`, using the app's existing vendored encoder,
  version 1, medium error correction, alphanumeric mode, and a four-module quiet zone. It is a
  real, decodable symbol for a fictional code, not a working server credential.
- Use the clearly separate simulation controls to approve pairing, expire a code, or show an
  error. Codes expire after five minutes while pairing is visible; leaving Settings cancels it.
- Sync, backup/restore, and Quit show their UX outcomes in memory. They do not perform I/O.

## Geometry and proposed behavior

The tablet surface is always **1872 × 1404 CSS pixels**, matching the landscape pixel dimensions
used by this repository's reMarkable 1 screenshot renderer. Fit applies only a uniform transform;
there are no responsive changes inside the tablet. At 1:1, one design pixel is one CSS pixel,
and a smaller browser window scrolls around that surface. Neither mode guarantees physical size
on a monitor. Browser/device fonts, anti-aliasing, on-screen keyboards, and e-ink refresh behavior
can differ; the QML implementation still needs a native render comparison and device review.

Tracking uses a 920px-high habit viewport. Rows have a 12px gap and a proposed 72–128px height:

```text
rowHeight = clamp(floor((920 - (visibleHabitCount - 1) * 12) / visibleHabitCount), 72, 128)
```

The empty roster is handled separately. Five and six habits get 128px rows, eleven get 72px
rows, and twelve or more use 72px rows with up/down controls. The row size depends on the full
visible roster, so it stays stable while scrolling. Font size and day-column width do not shrink.

Both scrolling directions call the existing `src/js/Scroll.js` helpers. Horizontal buttons move
seven day columns and clamp to the ends. The initial centered position is rounded to a whole
column to avoid half-cut cells. Vertical buttons move
`max(1, floor(viewportHeight / rowStep) - 1)` rows, retaining a row of overlap, then clamp at the
bottom exactly as the app does. Names and marks move together; date headers stay fixed. Editing
uses 120px rows and the same page-scroll model to leave space for its controls.

## Stack and implementation handoff

Prototype branch: `codex/remarkable-app-redesign-prototype`, based on
`codex/power-state-screens` at `8aefbf78bbef528175110d1941680700f6bfddfb` (PR #27).
The prototype is the primary design source, not production QML. Keep this branch out of main;
the implementation PR should start from the power-state branch, reference this prototype, and
port the approved design rather than ship this web demo.

Implementation work after design review:

1. Add one shared adaptive row geometry calculation; both labels and cells use it. Keep app
   dimensions driven by the apploader container, never a hardcoded QML root size.
2. Add minimum/maximum row sizes to Theme and pass the computed size/gap to both grid columns.
   Preserve the existing scroll helpers and recalculate/clamp offsets after visibility changes,
   insertions, deletions, and editing-mode changes. Reserve space for overflow controls.
3. Port B's header/actions, separate habit-management view, settings sections, and QR placement
   with the existing stores/signals. Preserve private filtering, X/O semantics, staged settings,
   discard/delete confirmations, sync gating, pairing lifecycle, and all power-image backup logic.
4. Cover native geometry at 0/1/5/6/7/11/12/20/35 habits, long names, privacy toggles, last-page
   clamping, edit mode, and non-default container sizes. Run Qt tests, host build and lint, then
   capture the native QML views at 1872 × 1404 for comparison.
5. Update the app README/screenshots for the approved implementation. Device deployment and
   real e-ink/keyboard checks remain user-run under the repository's never-SSH rule.

Current verdict: B selected; adaptive density and complete settings/pairing layout pending review.

## Verification recorded for this prototype

Browser checks covered 5/11/20/35-habit views; adding a twelfth habit enabling overflow;
35-habit last-page clamping; privacy changing the visible count from 11 → 10 → 11 and the row
height from 72 → 81 → 72; edit/add controls; staged server edits disabling Sync; discard
confirmation; QR expiry/new-code/approval; and the native surface measuring 1872 × 1404 via its
DOM bounds in 1:1 mode. No browser errors were reported. The same QR matrix and 296px rendering
geometry decoded as `H7K9Q2` with zbar. JavaScript syntax and changed web-file formatting passed.
These are prototype checks, not native-device validation.
