# reMarkable habit tracker

A small habit tracker for the **reMarkable 1** e-ink tablet. The reMarkable has no app ecosystem and no official way to run third-party software, but a community modding stack ([XOVI](https://github.com/asivery/xovi) + [rm-appload](https://github.com/asivery/rm-appload)) lets you load custom QML scenes inside the stock UI process. This is one such scene — a calendar grid of habits × days of the current month, persisted to disk, with a twist: it also overwrites the tablet's **sleep screen** with today's grid, so the habits are the first thing you see when you wake the device.

No accounts, no syncing, no telemetry, no backend. Just a QML scene drawn by the same Qt process that already runs the device's UI.

## What it looks like

```
June 2026
30 days · today is the 5th

                         1  2  3  4  [5] 6  7  8  9  10 …
Read 20 pages           ▢ ▢ ▢ ▢ ▣ ▢ ▢ ▢ ▢ ▢ …
Exercise                ▢ ▢ ▢ ▢ ▣ ▢ ▢ ▢ ▢ ▢ …
Meditate                ▢ ▢ ▢ ▢ ▣ ▢ ▢ ▢ ▢ ▢ …
No screens after 22:00  ▢ ▢ ▢ ▢ ▣ ▢ ▢ ▢ ▢ ▢ …
Journal                 ▢ ▢ ▢ ▢ ▣ ▢ ▢ ▢ ▢ ▢ …

[ Edit ]                                            [ Quit ]
```

## Features

- **Calendar grid layout.** One row per habit, one column per day of the month, today's column highlighted in inverted ink. Horizontal `‹` / `›` buttons scroll a week at a time when the month doesn't fit; the view opens centered on today. Vertical `↑` / `↓` buttons scroll a page of habits at a time when the list is taller than the screen; the day-of-month header stays fixed while the rows scroll.
- **Two habit modes.**
    - _Positive_ habits cycle empty → X → O → empty. X = done, O = explicitly not done.
    - _Negative_ habits invert it: every day is implicitly X ("didn't slip up today"), tap to flip to O when you do slip. Future days render muted and the name carries a `(−)` suffix.
- **Sleep-screen overlay.** When the tablet suspends, the latest habit grid is the lock-screen wallpaper. The original `suspended.png` is backed up before the first overwrite, and per-habit `Z` toggles can hide individual rows from the sleep image (they still show in the app).
- **In-app editing.** Reorder, rename, delete, toggle positive/negative, toggle sleep-screen visibility, add new habits — all from the device. No editing JSON by SSH.
- **Local persistence.** A single `habits.json` on the device. Delete it to reset to defaults.

## Install

You need a **reMarkable 1** (this targets Qt 5.15 specifically — it doesn't run on rM2). Because the device doesn't let you sideload apps natively, install the community stack first:

1. **XOVI** — a function-hooking framework for xochitl. See [`asivery/xovi`](https://github.com/asivery/xovi).
2. **rm-appload** — an XOVI extension that adds an app launcher. See [`asivery/rm-appload`](https://github.com/asivery/rm-appload).

Then build and deploy this app:

```sh
make build      # produces build/resources.rcc + staged icon/manifest
make deploy     # scps build/* to /home/root/xovi/exthome/appload/habit-tracker/
```

(`make deploy` needs `ssh remarkable` to resolve to the tablet — set it up in `~/.ssh/config`, or use `make REMARKABLE_HOST=<host> deploy`.)

On the tablet, hold the middle button for ~3 seconds to open apploader, then tap the **reMarkable habit tracker** tile.

## Daily use

- **Tap a cell** to cycle its state.
- **Edit** (bottom-left) enters edit mode. Each row gains `↑` / `↓` (reorder), `×` (delete with confirmation), `−` (toggle negative), `Z` (toggle sleep-screen visibility), and the name becomes a text input. An empty row at the bottom of the list takes a new habit name; tap `+` or press Enter to add.
- **Done** leaves edit mode.
- **Quit** (bottom-right) unloads the app and restores the normal xochitl UI.

State is saved to `/home/root/xovi/exthome/appload/habit-tracker/habits.json`. First launch seeds it from the defaults in `src/js/habits.js`. To reset, delete the file and relaunch.

## How it's built

The reMarkable 1 runs **xochitl**, the stock UI, which is itself a Qt 5.15 application. The community modding stack hooks into it:

- **XOVI** loads native extensions into xochitl.
- **rm-appload** is one such extension: it overlays a launcher on top of xochitl and runs each "app" as a QML scene inside xochitl's own Qt process. The frontend runtime it exposes is plain QML — no Wayland, no X, no framebuffer driver, no separate process.

This app is the QML scene. It's packaged as a Qt binary resource (`.rcc`) plus a small manifest and icon; deploy is `scp` of three files into apploader's directory on the device.

| Layer       | What                                                                 |
| ----------- | -------------------------------------------------------------------- |
| Hardware    | reMarkable 1 (e-ink, ARM, Linux-based firmware)                      |
| Stock UI    | xochitl (Qt 5.15 process)                                            |
| Hooking     | XOVI                                                                 |
| App runtime | rm-appload (XOVI extension, QML frontend host)                       |
| This app    | `Main.qml` + a `Theme` singleton, small components, plain JS helpers |
| Build       | `rcc-qt5 --binary` → `resources.rcc`                                 |
| Deploy      | `scp` to `/home/root/xovi/exthome/appload/habit-tracker/`            |

### Interesting bits

**Sleep-screen rendering.** xochitl displays `/usr/share/remarkable/suspended.png` while the device sleeps. The app draws today's grid to a hidden Qt `Canvas`, exports it to PNG, and overwrites that file. On first launch the original is backed up to `suspended.png.bak` (uninstalling does not restore it — copy it back manually if you want the stock image). The result: glance at a sleeping tablet and the habits are right there.

**Cheap re-renders.** Saving a 1404×1872 PNG and refreshing the lock screen is wasteful for trivial edits, so renders are _debounced_ (a 3-second timer restarts after each change while editing) and _deduplicated_ via a content signature persisted alongside the PNG — if nothing visible changed, nothing is written. A small status line ("Saving sleep image in 3s…" → "Sleep image saved") makes the pipeline visible. On quit, the latest state is flushed synchronously so the sleep screen never lags a tap behind.

**Pure QML + plain JS, no backend.** State lives in a single QML store (`HabitsStore.qml`) backed by a JSON file. Components forward signals upward; only the store mutates state. Updates are immutable (array spread, `Object.assign`) — the V4 engine handles re-bindings from there.

**Platform constraints shape the code.**

- _ES2016 / Qt 5.15 V4 engine._ No `async`/`await`, no optional chaining, no object spread. The codebase targets ES2016 deliberately and the project's `CLAUDE.md` captures the rule for future contributors (human or AI).
- _Grayscale e-ink, 16 levels._ Color renders as washed-out mid-grays; white is invisible against the paper-white background. The UI is strict black-on-white with weight, borders, and inversion as the only emphasis tools.
- _Portrait display, landscape layout._ `Main.qml` wraps the scene in an `Item { rotation: 90 }` with `width` and `height` swapped, so the rest of the QML reads as a normal landscape layout.

## Building from source

You need Qt 5's `rcc` (Qt 6's works too for `--binary`, but the device runtime is Qt 5.15 — stay on 5 to avoid surprises):

- Arch/Manjaro: `pacman -S qt5-base` (binary is `rcc-qt5`)
- Debian/Ubuntu: `apt install qtbase5-dev-tools`
- macOS: `brew install qt@5`

Override the binary with `make RCC=<path>` if it isn't on `$PATH` as `rcc-qt5`.

```sh
make build      # produces build/resources.rcc + staged icon/manifest
make deploy     # scps build/* to the device
make remove     # uninstalls from the device
make clean      # nukes local build/
```

## Repo layout

```
.
├── application.qrc      # files bundled into the .rcc
├── manifest.json        # apploader manifest (id, display name, entry path)
├── icon.png             # launcher icon
├── Makefile             # build / deploy / remove / clean
├── src/
│   ├── Main.qml         # entry; root declares signal close + unloading()
│   ├── Theme.qml        # singleton: sizes, fonts, colors
│   ├── HabitsStore.qml  # JSON-backed habit store, sole source of mutation
│   ├── components/      # reusable QML pieces (AppButton, HabitsGrid, SuspendCanvas, …)
│   └── js/              # plain JS modules (date helpers, scroll math, sleep-image draw)
└── build/               # rcc output + deploy staging (gitignored)
```

## Development notes

apploader runs inside xochitl, so QML parse errors and `console.log()` output land in xochitl's stderr → systemd journal:

```sh
ssh remarkable journalctl -fu xochitl --no-pager
```

apploader prefixes its messages with `[AppLoad]:` / `[QTFB]:`. `[QTFB]: Unregistered framebuffer controller ID: -1` is harmless for QML-only apps.

### Platform gotchas worth knowing before editing

1. **QML files must live inside the `.rcc`.** Loose `.qml` files on the device aren't found. Add new files to `<qresource>` in `application.qrc` (and to the relevant `qmldir`) and rebuild.
2. **`entry` in `manifest.json` must start with `/`.** apploader concatenates the entry onto `qrc:/<nonce>` with no separator; without the leading slash you get `qrc:/NONCEMain.qml` and "No such file."
3. **Root QML conventions.** The root must declare `signal close` and `function unloading() { ... }`. Emit `close()` from the Quit handler — `Qt.quit()` is a no-op (the Qt process is xochitl, you don't own it).
4. **No hardcoded root size.** apploader sizes the container; use `anchors.fill: parent`. Hardcoded `width: 1404; height: 1872` is silently ignored.
