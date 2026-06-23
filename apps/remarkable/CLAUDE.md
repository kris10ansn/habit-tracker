# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Maintaining this file

Update CLAUDE.md as you learn the user's preferences for code style, workflow, or project conventions that should persist across sessions. Keep it lean: max 200 lines, every line must earn its place. Prefer tightening or replacing existing sections over appending new ones, and remove guidance that becomes obsolete.

## What this is

A pure-QML **habit tracker** for **reMarkable 1**, launched via **apploader** — specifically the XOVI extension `asivery/rm-appload`. apploader's frontend runtime is QML, loaded inside xochitl's process. No backend. Renders a landscape grid of habits × days-of-the-current-month with the current day highlighted.

This is the `apps/remarkable/` app in the habit-tracker monorepo (pnpm workspaces). The sibling expo client is `apps/mobile/`; a shared backend is planned. See the monorepo-root `CLAUDE.md` for cross-app conventions.

**Domain docs.** Two glossaries: this app's `CONTEXT.md` (device-only terms — suspend image, suspend visibility, settings, edit mode) and the monorepo-root [`../../CONTEXT.md`](../../CONTEXT.md) (the shared Habit / Entry / X-O / polarity vocabulary every client speaks). [`../../CONTEXT-MAP.md`](../../CONTEXT-MAP.md) ties them together. This app's `docs/adr/` records deliberate decisions you must not silently undo (overwriting the system suspend image, corrupt-file safety, debounce/signature dedup, deferred grid, ListModel store, month-partitioned storage). Read both glossaries before changing domain behaviour, and keep them current when it changes.

## Hard rule: never SSH to the device

Under no circumstance may the agent run `ssh`, `scp`, `rsync`, `make deploy`, `make remove`, or any other command that touches the reMarkable. That includes "read-only" probes like `ssh remarkable journalctl …` or `ssh remarkable ls …`. The user runs all device-side commands and pastes back the output. If a step requires device interaction, describe what to run and wait — do not execute it.

This applies even when a `make` target wraps the SSH (e.g. `make deploy`, `make remove`) — those are user-only.

## Commands

- `make build` — compiles `application.qrc` → `build/resources.rcc` via `rcc-qt5`, stages `manifest.json` + `icon.png` alongside it.
- `make deploy` — builds, then `scp`s `build/*` to `/home/root/xovi/exthome/appload/habit-tracker/` on the device.
- `make remove` — uninstalls from the device.
- `make clean` — removes local `build/`.

Overrides: `make REMARKABLE_HOST=<host>` (default `remarkable`), `make RCC=<path>` (default `rcc-qt5`; rM1 is Qt 5.15, so Qt 5's rcc is required).

There are no tests or linters.

## How apploader loads the app — the non-obvious bits

These are easy to miss and have already cost debug cycles:

1. **QML is not deployed loose.** apploader loads QML from a Qt **binary resource** (`resources.rcc`), not from `.qml` files on disk. `application.qrc` lists files to bundle; `rcc --binary` produces the `.rcc`; only the `.rcc` (plus `manifest.json` + `icon.png`) gets deployed.
2. **`entry` in `manifest.json` must start with `/`.** apploader builds the load URL as `qrc:/<random-nonce><entry>` (raw concatenation, no separator added). Without the leading slash you get `qrc:/NONCEMain.qml` and "No such file." Path is _inside_ the rcc.
3. **Root QML conventions.** The root component must declare `signal close` and `function unloading() { ... }`. Emit `close()` from your "Quit" handler to ask apploader to unload the frontend — `Qt.quit()` is a no-op (Qt's process is xochitl).
4. **No hardcoded root size.** apploader sizes the container; use `anchors.fill: parent` on the root and anchor children to it. Hardcoded `width: 1404; height: 1872` will be silently ignored.

## Display constraints (grayscale e-ink)

The rM1 screen is 16-level grayscale e-ink. Color is not just stylistic — it determines whether content is visible at all:

- **Never use white or near-white** (`"white"`, `"#fff"`, very light grays) for foreground content (text, icons, borders). It vanishes against the paper-white background. Default background is white; default foreground is black.
- **Avoid colored fills/strokes** (red, blue, green, etc.). They render as a mid-gray that washes out and loses contrast. Use black, dark gray, or leave unfilled.
- For emphasis, prefer weight/size/borders/inversion (black-on-white vs white-on-black blocks) over color.
- When inverting (light text on dark fill), the fill must be dark enough — black or near-black — for the light text to read.

## Debugging

apploader runs inside xochitl, so QML errors and `console.log` go to xochitl's stderr → systemd journal on the device:

```
ssh remarkable journalctl -fu xochitl --no-pager
```

Tail this in another terminal while launching the app. apploader prefixes its own messages with `[AppLoad]:` and `[QTFB]:`. `[QTFB]: Unregistered framebuffer controller ID: -1` is harmless for QML-only apps (no qtfb requested).

## Adding new QML files

Append to `<qresource>` in `application.qrc` **and** register the type in the directory's `qmldir`. The `entry` field stays pointing at the root component.

## QML import namespaces

`Main.qml` does `import "." as App` and `import "components" as App`, so both `Theme` (in `src/`) and components (in `src/components/`) are reached via the `App.` prefix. **Files inside `src/components/` use `import ".." as App` — that prefix points at `src/`, NOT at `src/components/`.** From a component file, reference sibling components bare (`AppButton`, not `App.AppButton`); use `App.Theme` for the singleton. Getting this wrong fails at load with `Type App.X unavailable / No such file or directory` pointing at `src/X.qml`.

## Stores and navigation

- **Persisted state uses `JsonStore.qml`.** That base owns the deferred initial load, the 200 ms debounced save, the `saved`/`saveFailed` signals, and `flushPendingSave`. A store sets `filePath` and assigns two function-property hooks: `serialize` (→ the value to write) and `applyLoaded(data)` (← fold a just-read value, handling the `Storage` MISSING/CORRUPT sentinels). Don't re-implement file I/O or the save timer per store. `SettingsStore` extends it directly; `HabitsStore` instead **composes two `JsonStore` children behind a facade** — a roster store (`data/roster.json`: id + name + polarity + suspend visibility) and a month store (`data/YYYY-MM.json`: the current month's entries keyed by habit id). The ListModel is the single in-memory source of truth and each child serializes a *projection* of it (`HabitsModel.toRoster` / `toMonthEntries`); config edits schedule the roster save, entry toggles the month save. Load is parallel, folded by id once both resolve. See [`docs/adr/0002-month-partitioned-habit-storage.md`](docs/adr/0002-month-partitioned-habit-storage.md). These `src/` stores resolve as `App.<Name>` without a `src/qmldir` entry (file-based resolution).
- **Saves are loud, never silent.** `Storage.writeJson` throws on failure instead of returning a boolean; `JsonStore._doSave` catches it into the `saveFailed` signal, which `HabitsStore` exposes as `saveError` and `Main` shows as a dismissable modal — the session keeps running in memory. The `data/` dir must exist (QML/XHR can't `mkdir`; the deploy creates it); a missing dir therefore surfaces visibly on first save rather than losing data.
- **Full-screen views switch via `landscape.currentView`** (`"grid"` | `"settings"`) in `Main.qml` — each view is an `Item` gated by `visible`. No StackView/router; add a view as a sibling `Item` plus a `currentView` value. Pages forward signals up to `Main`, which owns the stores and orchestrates side effects (e.g. suspend-image backup/restore on the settings commit).

## Code style

- **Container components forward signals; they don't reach into stores.** Components expose signals up to the page that owns the store, which wires them to store methods. Keeps components reusable and dependencies one-way.
- **Extract on duplication, not speculation.** Collapse near-identical blocks into a component or shared JS helper. Before writing a new helper, grep for one with the same shape — duplication crosses file types (JS↔QML) and consumer boundaries (store↔component).
- **Target ES2016 / Qt 5.15 V4 engine.** Use `let`/`const` (never `var`), arrow functions, template literals, destructuring, array spread (`[...arr]`), default params, `Array.prototype.includes`, native `String.prototype.trim()`. NOT available: `async`/`await`, object spread (`{...obj}` — use `Object.assign({}, a, b)`), optional chaining (`?.`), nullish coalescing (`??`).
- **Functional style.** Prefer pure functions, immutable updates (spread / `Object.assign` / `slice` over in-place mutation), `.map`/`.filter`/`.reduce` over imperative loops, `const` arrows for small helpers. In `.pragma library` files, top-level exports use `function` declarations; internal helpers use `const` arrows.
- **Flat code, max 2 levels of nesting.** No `if` / `try` / loop nested 3+ deep. Use early returns, guard clauses, extracted helpers, or logical operators (`||`, `&&`, ternaries) to flatten. If a block would reach 3 levels, extract a function.
- **In QML bindings, prefer expressions over imperative blocks.** A `property` or signal handler that's just an `if`-ladder returning values should be a ternary, or a small extracted `readonly property` should carry the condition.
- **Blank lines within functions separate logical phases.** Add a blank line after guard clauses / early returns, between setup and computation, or before a return statement. Groups related statements visually.
- **Comments sparingly.** Default to no comments. Only add one when the WHY is non-obvious (hidden constraint, subtle invariant, workaround for a specific bug, surprising behavior). Don't explain WHAT — well-named identifiers do that. If removing the comment wouldn't confuse a future reader, don't write it.
- **Self-update on style refactor.** When a refactor revises a code-style preference here (banning a pattern, adopting a new helper convention, moving the JS target), update this section in the same change so future sessions inherit the rule.

## Keep README.md current

When functionality changes (new features, removed features, changed UX, new commands), update `README.md` in the same change. The README is the user-facing description of what the app does and how to use it — it must not drift from the actual behavior.

## Device-side details

- App lives at `/home/root/xovi/exthome/appload/habit-tracker/` after deploy.
- Open apploader on the device by holding the middle button ~3 seconds.
- This app lives at `apps/remarkable/` in the monorepo; its directory name (and the repo's `~/src/...` path) is historical and not a Rust project despite prior Rust attempts. App code lives under `src/`: `Main.qml` + `Theme.qml` singleton at the top, reusable QML in `src/components/`, plain JS in `src/js/`. Each QML directory has a `qmldir`. Run all `make` commands from `apps/remarkable/` (paths in the Makefile and `application.qrc` are app-relative).
