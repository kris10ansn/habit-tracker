# suspend-writer

Renders the reMarkable suspend image **outside** the QML app. It hosts the app's own
`src/js/SuspendDraw.js` in a `QJSEngine` with a thin QPainter-backed Canvas2D shim, so the exact
same renderer the app uses produces a PNG — no QML runtime needed. It runs both on your machine (for
previewing) and on the device (headless, to write the real suspend image).

Still a spike: no settings/opt-in check, no backup, no `.sleep-sig` dedup — it always writes.

## Layout

```
tools/suspend-writer/
├── main.cpp           the tool (Canvas2D shim + QJSEngine host)
├── build-host.sh      host build (Qt5, no SDK)        → build/suspend-writer
├── build-device.sh    cross build (ARM, Qt6, via SDK) → build/suspend-writer-arm
├── build/             build outputs                    (gitignored)
├── sample-data/       roster/month JSON for previewing (gitignored)
└── sdk/               unpacked reMarkable SDK           (gitignored, you provide)
```

All targets below are run from `apps/remarkable/` (the app Makefile owns them); the scripts are also
runnable directly from this dir.

## Preview on your machine (host build)

Needs Qt5 dev packages (`Qt5Core`, `Qt5Gui`, `Qt5Qml`) on `pkg-config`'s path. No SDK required.

```sh
make suspend-writer-host                       # → tools/suspend-writer/build/suspend-writer
tools/suspend-writer/build/suspend-writer \
  --roster tools/suspend-writer/sample-data/roster.json \
  --month  tools/suspend-writer/sample-data/2026-06.json \
  --today  2026-06-25 --out /tmp/preview.png
```

The host build bakes the app's `src/js` as the default `--js-dir`, so it reuses the live renderer
straight from source. Text fidelity is approximate (host `sans-serif` ≠ device font), so this
validates layout and logic, not pixel-exact device output.

| Flag       | Required | Default         | Notes                                                               |
| ---------- | -------- | --------------- | ------------------------------------------------------------------- |
| `--roster` | yes      | —               | Roster file (identity + config + display order).                    |
| `--month`  | no       | `{}`            | The month whose entries to draw. Omitted → an empty grid.           |
| `--today`  | no       | system date     | `YYYY-MM-DD`. Sets which day is highlighted and the cutoff.         |
| `--out`    | no       | `suspended.png` | Output PNG path.                                                    |
| `--js-dir` | no       | build default   | Dir holding `SuspendDraw.js` + `DateUtils.js` (set this on-device). |

## Building & deploying to the reMarkable

Unlike a live e-paper app, this is **headless** — it renders a `QImage` to a PNG, so it needs no
`epaper` plugin and never stops xochitl. That keeps the cross-build simple.

### 1. Get the SDK

The device build uses reMarkable's **codex toolchain** (OpenEmbedded cross-compiler + a target
sysroot). Download the installer for your **host** architecture from reMarkable's developer
downloads (<https://developer.remarkable.com/links>), matching your **device's OS version**. See (<https://developer.remarkable.com/documentation/sdk>) for further information.

> **Match the version to your device.** The sysroot's Qt version is whatever the chosen image
> shipped (the current one is **Qt 6.8**). The binary links against it, so an SDK newer than the OS
> on your reMarkable can link libraries the device doesn't have.

Run the self-extracting installer and point it at `./sdk` in this directory:

```sh
sh remarkable-production-image-*-rm1-public-x86_64-toolchain.sh -y -d tools/suspend-writer/sdk
```

After it unpacks, `tools/suspend-writer/sdk/environment-setup-cortexa9hf-neon-remarkable-linux-gnueabi`
must exist — `build-device.sh` sources it for the cross `$CXX`, a sysroot-aware `pkg-config`, and the
host `moc`. The installer and `sdk/` are large and gitignored.

### 2. Cross-build

```sh
make suspend-writer-device                     # → tools/suspend-writer/build/suspend-writer-arm
```

Produces a 32-bit ARM ELF for `cortexa9hf-neon` (rM1). `main.cpp` is source-compatible across
Qt5/Qt6, so this needs no source changes.

> **Qt 5 vs Qt 6.** The QML app's `rcc` targets Qt 5.15, but this binary links the SDK's
> `libQt6{Core,Gui,Qml}.so.6`. The device must provide matching Qt6 runtime libs; verify on-device
> with `ldd ./suspend-writer-arm` (no line should say "not found").

### 3. Deploy

```sh
make suspend-writer-deploy                     # cross-builds, then scps to the device
```

This copies, into `…/appload/habit-tracker/suspend-writer/` on the device:

- `suspend-writer-arm` — the binary, and
- `SuspendDraw.js` + `DateUtils.js` — **the two JS modules it reads at runtime.** The app bundles
  these inside `resources.rcc`, so they are _not_ otherwise present as files on the device; the tool
  loads them loose via `--js-dir`, so they must be deployed alongside it.

### 4. Run on the device

Headless, with the offscreen platform (its plugin ships in the SDK sysroot under
`usr/lib/plugins/platforms/`; copy it next to the binary if the device lacks it):

```sh
QT_QPA_PLATFORM=offscreen ./suspend-writer-arm \
  --js-dir . \
  --roster ../data/roster.json \
  --month  ../data/<YYYY-MM>.json \
  --out    /tmp/test-suspend.png
```

> **Data-loss caveat.** The real suspend image is `/usr/share/remarkable/suspended.png`. Writing
> `--out` straight there clobbers the stock image with **no backup** (no settings/opt-in, no `.bak`)
> — this safety is the still-unaddressed next step. Render to a scratch path first.

## Input JSON shapes

These are the **same files the app's stores write** under its `data/` dir. ADR
[`0002-month-partitioned-habit-storage.md`](../../docs/adr/0002-month-partitioned-habit-storage.md)
is the source of truth; the tool reads the same envelopes (`roster.habits`, `month.entries`) and
degrades to empty if either is missing or malformed.

**`roster.json`** — identity + config, no entries. Array order is display order:

```json
{
    "habits": [
        {
            "id": "<habitId>",
            "name": "Read",
            "negative": false,
            "hideFromSleep": false,
            "updatedAt": 1782148800000
        }
    ]
}
```

- `negative` — polarity. A negative habit defaults to marked (X) and is _cleared_ with `o`.
- `hideFromSleep` — when `true`, the habit is omitted from the suspend image.

**`YYYY-MM.json`** — one month's entries, keyed by habit id then by date. Each cell is
`{ state, updatedAt }`; `state` is `"x"` (marked), `"o"` (explicitly cleared), or `""` (tombstone):

```json
{
    "month": "2026-06",
    "entries": {
        "<habitId>": {
            "2026-06-01": { "state": "x", "updatedAt": 1782148800000 }
        }
    }
}
```

The tool flattens each cell to its `state` string and drops empties — mirroring
`HabitsModel.toArray` / `statesOf`, the projection `SuspendDraw` expects. Entry ids absent from the
roster are ignored (orphans never render), matching the app's fold-by-id.

## How the JS is reused

`QJSEngine` is not a full QML JS runtime, so `main.cpp`:

- strips QML's `.import` / `.pragma` lines and IIFE-wraps each module to return its named exports,
  mirroring `import "X.js" as X`;
- supplies a minimal `Qt.formatDate` stand-in (the only QML global `DateUtils.js` reaches);
- injects file contents as engine globals (`rosterJson`, `monthJson`) parsed with `JSON.parse` —
  never string-concatenated into source, so quotes/newlines in data can't break the script.
