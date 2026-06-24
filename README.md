# Habit Tracker

A habit tracker that lives where you'll actually see it — on the sleep screen of a
**reMarkable 1** e-ink tablet — with a companion mobile app and a self-hosted sync backend, all
in one pnpm monorepo over a single shared habit domain.

No accounts. No telemetry. Standalone and offline by default; point it at your own server only if
you want your habits on more than one device.

```
apps/
├── remarkable/   QML habit tracker for the reMarkable 1 e-ink tablet (XOVI + rm-appload)
├── mobile/       Expo / React Native / TypeScript app
└── backend/      ASP.NET Core + EF Core + Postgres — owns canonical state and sync
```

Every client renders the same thing: your habits and their per-day **X / O** marks for the current
month. The reMarkable lays it out landscape (habits as rows, days as columns); the mobile app
transposes it to portrait (days as rows, habits as columns). Orientation is presentation — the
underlying model is shared.

---

## The idea

Most habit trackers ask you to open an app. This one meets you halfway: on the reMarkable, it can
overwrite the tablet's **suspend image** — the full-screen picture shown while the device sleeps —
with today's habit grid. Glance at a sleeping tablet on your desk and the habits are already there,
no taps required. (It's opt-in, and backs up your original sleep image first.)

```
June 2026
30 days · today is the 5th

                         1  2  3  4  [5] 6  7  8  9  10 …
Read 20 pages           ▢ ▢ ▢ ▢ ▣ ▢ ▢ ▢ ▢ ▢ …
Exercise                ▢ ▢ ▢ ▢ ▣ ▢ ▢ ▢ ▢ ▢ …
Meditate                ▢ ▢ ▢ ▢ ▣ ▢ ▢ ▢ ▢ ▢ …
No screens after 22:00  ▢ ▢ ▢ ▢ ▣ ▢ ▢ ▢ ▢ ▢ …
Journal                 ▢ ▢ ▢ ▢ ▣ ▢ ▢ ▢ ▢ ▢ …

[ Edit ]                            [ Settings ] [ Quit ]
```

Two kinds of habit:

- **Positive** — something you want to do. Tap a day to cycle empty → **X** (done) → **O** (not
  done) → empty.
- **Negative** — something you want to avoid. Every day is implicitly a success ("didn't slip");
  tap only the days you slip to flip them to **O**.

The full vocabulary (Habit, Entry, polarity, X/O, …) is the
[shared glossary](./CONTEXT.md) every client and the backend speak.

---

## For users

### reMarkable tablet — the main client

A pure-QML app for the **reMarkable 1**. The device has no app store and no official way to run
third-party software, so it rides on the community modding stack
([XOVI](https://github.com/asivery/xovi) + [rm-appload](https://github.com/asivery/rm-appload)),
which loads custom QML scenes inside the stock UI.

Highlights:

- **Calendar grid** of habits × days, today's column highlighted, scrollable a week / a page at a
  time when things don't fit.
- **Suspend-image overlay** — opt-in; draws today's grid onto the sleep screen, with per-habit
  toggles to hide rows from it.
- **In-app editing** — add, rename, reorder, delete, and flip habits between positive/negative,
  all on the device. No editing JSON over SSH.
- **Optional offline-first sync** — leave the server blank and nothing ever leaves the tablet;
  set a server URL to sync across devices, last-write-wins, with tombstoned deletes.

Install and usage live in [`apps/remarkable/README.md`](./apps/remarkable/README.md).

### Mobile app

An [Expo](https://expo.dev) (SDK 56) app in TypeScript, styled with
[NativeWind](https://www.nativewind.dev). Barebones on purpose — **functionality first, design
later**. Today it renders the same model transposed to portrait from sample data; persistence and
sync are next. See [`apps/mobile/README.md`](./apps/mobile/README.md).

### Backend (self-hosted, optional)

An ASP.NET Core (.NET 10) + EF Core + PostgreSQL service that owns the canonical habit records and
reconciles them across clients. Unauthenticated for now — run it on a trusted network (home LAN /
Tailscale / VPN), not the open internet. See [`apps/backend/README.md`](./apps/backend/README.md).

---

## For the technically curious

A few things here are more interesting than a habit tracker has any right to be.

**Drawing onto the e-ink sleep screen.** xochitl (the reMarkable's stock Qt 5.15 UI) shows
`suspended.png` while the device sleeps. The app renders the grid to a hidden Qt `Canvas`, exports
a 1404×1872 PNG, and overwrites that file. To avoid writing a full PNG on every trivial tap, renders
are **debounced** and **deduplicated** against a content signature — if nothing visible changed,
nothing is written. Enabling backs the original up; disabling restores it.

**Living inside someone else's process.** There's no separate app process — no Wayland, no X, no
framebuffer driver. rm-appload runs each "app" as a QML scene inside xochitl's own Qt process. That
shapes everything: `Qt.quit()` is a no-op (you don't own the process), QML must be bundled into a
`.rcc` binary resource, and the root component speaks a small apploader protocol.

**Targeting a 2017 JS engine on purpose.** Qt 5.15's V4 engine is roughly ES2016 — no `async`/`await`,
no optional chaining, no object spread. The code embraces the constraint rather than transpiling
around it, and the per-app `CLAUDE.md` encodes the rule so it survives future edits.

**Grayscale e-ink as a design constraint.** 16 levels of gray, no color: white is invisible against
paper-white, and colored fills wash out to mid-gray. The UI is strict black-on-white, using weight,
borders, and inversion as the only emphasis tools.

**One model, three reframings.** The shared domain speaks Habit / Entry / X-O. The clients render it
in opposite orientations; the backend reframes it again for a relational store — X/O becomes
**Outcome** (Success/Failure), per-habit date→mark maps become `(habit, date)` rows, and it adds
ownership (User) and ordering (Position). The translations stay on the client side. The
[context map](./CONTEXT-MAP.md) explains how the pieces relate.

**Offline-first sync.** State-based, last-write-wins per row, with a client-stamped *edit-time* as
the merge key and tombstones so deletes can win or lose against a dated edit rather than silently
resurrecting. The merge runs server-side; the client sends its state and accepts the authoritative
result. See [`docs/adr/0003`](./docs/adr/0003-offline-first-sync.md).

### Architecture decisions

System-wide ADRs live in [`docs/adr/`](./docs/adr/):

- [0001 — Monorepo with a shared habit domain](./docs/adr/0001-monorepo-with-shared-domain.md)
- [0002 — Backend on C# / ASP.NET Core + EF Core over Postgres](./docs/adr/0002-csharp-ef-core-backend.md)
- [0003 — Offline-first sync](./docs/adr/0003-offline-first-sync.md)

Each app keeps its own narrower ADRs under `apps/*/docs/adr/`.

---

## Working in the repo

Requires [pnpm](https://pnpm.io). From the root:

```sh
pnpm install        # install deps for every workspace package
pnpm format         # prettier + per-app formatters across the repo
pnpm lint           # lint every app
pnpm typecheck      # typecheck every app
```

Per-app delegators from the root:

```sh
pnpm mobile:start                     # expo dev server (also :android / :ios / :web)
pnpm remarkable:build                 # build the reMarkable .rcc (also :clean)
pnpm backend:start                    # run the API (also :build / :watch / :test / :migrate)
pnpm backend:db:up                    # start local Postgres (also :db:down / :db:clear)
```

> **Device commands are intentionally not wired for automation.** `remarkable:deploy` / `:remove`
> shell out to `make` and touch the tablet over SSH — run those yourself from `apps/remarkable/`.

Anything not wired above: `pnpm --filter @habit-tracker/<app> run <script>`.

### Layout & conventions

```
/
├── apps/
│   ├── remarkable/   pure QML, built with make → resources.rcc
│   ├── mobile/       expo + TypeScript
│   └── backend/      ASP.NET Core + EF Core + Postgres
├── CONTEXT.md        shared habit glossary
├── CONTEXT-MAP.md    how the contexts relate
└── docs/adr/         system-wide architecture decisions
```

A shared `.prettierrc.json` applies repo-wide; language-specific style rules live in each app's
`CLAUDE.md`. The house style favors verbose, descriptive names in code and persisted data, and uses
the shared habit vocabulary in code, comments, and docs.
