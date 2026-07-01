# 4. Navigate to other months in place, keeping "now" special

Status: accepted

## Context

The app was built around a single assumption: it only ever shows the **current real month**.
`today = new Date()` drove the month key, which drove the loaded month file, the highlighted
"today" column, the suspend image, and the sync unit. ADR 0002 already partitioned storage per
month and called this out as "forward-compatible with a future 'view other months' feature
without committing to it now." This is that feature: `‹` / `›` arrows flanking the month header
step backward and forward through months, with full read/write on any month (including
backfilling a month never tracked before).

The hard part is not the arrows — it's that four things were silently coupled to "the month in
memory": the loaded entries, the today-highlight, the **suspend image**, and the **sync** unit.
Navigation must move some of those (entries, sync) while pinning others (suspend, today) to the
real current month.

## Decision

**One in-memory model, re-pointed.** There is still a single `ListModel`. Navigating flushes any
pending save to the *old* month's file, re-points the month `JsonStore.filePath`, and re-reads
the new month, folding its entries onto the roster by id (`HabitsStore.loadMonth`). The roster
(identity/config) is month-independent and never reloads. `monthKey` — and therefore the month
file path *and* `SyncStore.monthKey` — derive from a viewed-month (`viewYear`/`viewMonth`), so
both follow navigation automatically. The flush must happen **before** the re-point, or a
debounced edit lands in the wrong month's file.

**Unbounded, but empty months write nothing.** Arrows never clamp — you can wander to any month,
past or future. A month with no data renders the full roster with no marks; **no file is created
until a box is toggled** (the month load folds empty entries without seeding+saving, unlike the
roster). This keeps ADR 0002's promise that the app never enumerates `data/` — no directory scan,
no bounds machinery.

**The current month stays special.** Only when the viewed month *is* the real current month does
a day highlight (today) and the subtitle show "today is the Nth". The today-highlight and the
future-day muting are split into two signals — `highlightDay` (which column to invert) and
`lastNonFutureDay` (days after which are "future") — because a past month has no highlight but all
days are non-future, and a future month has no highlight and all days are future.

**Suspend image = always the current month.** Every suspend render trigger is guarded by
`isCurrentMonth`; while browsing another month no render fires, and a render debounced against the
current month is cancelled on leaving it (so it can't paint the swapped-in month). Quitting while
browsing skips the final render, leaving the last current-month image on the lockscreen — accepted
because current-month data can't change while you browse elsewhere. Returning to the current month
schedules a self-deduping render to recover from the one drift case (suspend enabled mid-browse).

**Sync follows the viewed month, guarded against mid-flight navigation.** Arriving at a month
pulls it from the server (no-op when standalone); edits push it. Because a request is per-`monthKey`
but the response lands asynchronously, each request captures its `monthKey` and the response is
**discarded if the viewed month changed before it returned** — otherwise one month's server state
would fold onto another. Unpushed tombstones simply resend on the next sync.

## Considered options

- **Bounded to months with data** (enumerate `data/`, clamp to earliest…current) — rejected: it
  reintroduces the directory scan ADR 0002 avoided, and blocks backfilling a month that has no
  file yet. Unbounded + "no file until a box is toggled" gives backfill for free with no scan.
- **A second dataset for the suspend image** (keep current-month entries in memory purely for
  suspend, render from that while browsing) — rejected as over-built for one edge; "skip render,
  keep last" is correct because current-month data is immutable while browsing elsewhere.
- **Suspend mirrors the on-screen month** — rejected: the lockscreen is a passive "now" dashboard;
  sleeping while browsing March should not leave March on the lockscreen.
- **Async Loader rebuild per month switch** — not needed: a switch only re-binds `entries` and a
  ±3-day column count on the already-built grid; the async Loader exists to avoid the *first*
  600-delegate construction, which a re-point doesn't repeat.

## Consequences

- Any month is viewable and editable; backfilling an untracked month just works and writes its
  file lazily on first toggle. The `data/` scan-free invariant from ADR 0002 holds.
- The lockscreen always reflects the real current month, never a browsed one, at the cost of a
  narrow staleness window (a current-month sync during a browse isn't drawn until return).
- Sync correctly targets whatever month you edit, and fast month-hopping can't cross-contaminate
  months because stale responses are dropped.
- `today` (real) and the viewed month are now distinct in both `Main.qml` (`landscape`) and
  `HabitsStore`; future work must not re-collapse them.
