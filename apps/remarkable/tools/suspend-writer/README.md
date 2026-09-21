# suspend-writer

Renders the reMarkable suspend image **outside** the QML app. It hosts the app's own
`src/js/SuspendDraw.js` in a `QJSEngine` with a thin QPainter-backed Canvas2D shim, so the exact
same renderer the app uses produces a PNG — no QML runtime needed. It runs both on your machine (for
previewing) and on the device (headless, to write the real suspend image).

The same binary also runs the production power-image service (`--serve`) and its isolated job
workers (`--worker`). Plain `--roster ... --out ...` remains a preview CLI; only service jobs own
backup, restore, and deduplication.

## Layout

```
tools/suspend-writer/
├── main.cpp           CLI and service entry points
├── Renderer.cpp       shared Canvas2D shim + QJSEngine renderer
├── PowerImageService.cpp  job queue, workers, backup/restore, and local HTTP
├── build-host.sh      host build (Qt5, no SDK)        → build/suspend-writer
├── build-device.sh    cross build (ARM, Qt6, via SDK) → build/suspend-writer-arm
├── build/             build outputs                    (gitignored)
├── sample-data/       roster/month JSON for previewing (gitignored)
└── sdk/               unpacked reMarkable SDK           (gitignored, you provide)
```

All targets below are run from `apps/remarkable/` (the app Makefile owns them); the scripts are also
runnable directly from this dir.

## Preview on your machine (host build)

Needs Qt5 dev packages (`Qt5Core`, `Qt5Gui`, `Qt5Qml`, `Qt5Network`) on `pkg-config`'s path. No SDK required.

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

| Flag       | Required | Default         | Notes                                                       |
| ---------- | -------- | --------------- | ----------------------------------------------------------- |
| `--roster` | yes      | —               | Roster file (identity + config + display order).            |
| `--month`  | no       | `{}`            | The month whose entries to draw. Omitted → an empty grid.   |
| `--today`  | no       | system date     | `YYYY-MM-DD`. Sets which day is highlighted and the cutoff. |
| `--out`    | no       | `suspended.png` | Output PNG path.                                            |
| `--js-dir` | no       | build default   | Dir holding the five JS modules below (set this on-device). |

## Building & deploying to the reMarkable

Unlike a live e-paper app, this is **headless** — it renders a `QImage` to a PNG, so it needs no
`epaper` plugin and never stops xochitl. That keeps the cross-build simple.

### 1. Get the SDK

The device build uses reMarkable's **codex toolchain** (OpenEmbedded cross-compiler + a target
sysroot). Download the installer for your **host** architecture from reMarkable's developer
downloads (<https://developer.remarkable.com/links>), matching your **device's OS version**. See (<https://developer.remarkable.com/documentation/sdk>) for further information.

> **Match the version to your device.** The sysroot's Qt version is whatever the chosen image
> shipped. The binary links against it, so an SDK newer than the OS
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
> `libQt6{Core,Gui,Qml,Network}.so.6`. The device must provide matching Qt6 runtime libs; verify on-device
> with `ldd ./suspend-writer-arm` (no line should say "not found").

### 3. Deploy

```sh
make suspend-writer-device                     # user-run cross-build
make deploy-test                               # install isolated TEST app and helper
# make deploy CONFIRM_STABLE=1                  # replace stable app and helper
```

This copies, into `…/appload/<app-id>/suspend-writer/` on the device:

- `suspend-writer-arm` — the binary, and
- `SuspendDraw.js`, `DateUtils.js`, `Entries.js`, `Polarity.js`, `HabitsModel.js` — **the five JS
  modules it reads at runtime.** The app bundles these inside `resources.rcc`, so they are _not_
  otherwise present as files on the device; the tool loads them loose via `--js-dir`, so they must
  be deployed alongside it. The list lives in the Makefile as `SW_JS_MODULES`; if `SuspendDraw.js`
  or `HabitsModel.js` gains an `.import`, add the target there too or the tool dies with a
  `ReferenceError` naming the missing module.

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

The plain preview CLI writes exactly the `--out` path and does not manage originals. Use a scratch
path for previews. Production uses the service lifecycle below.

## Production service

`deploy` stops the previous helper before replacing its executable, then installs and starts
`<app-id>-images.service` with the ARM binary and shared renderer modules. Close the frontend before updating.
The service has a low scheduling priority and runs outside xochitl. Stable uses loopback port
47831; test uses 47832. A newly generated owner-only `power-image-token.json` in the app directory
authenticates requests. There is no browser CORS access and no network listener beyond loopback.

QML submits JSON POST requests with a `Bearer` token. `render` and `preview` receive an immutable
`{ date, roster: { habits }, month: { month, entries }, rendererSignature }` snapshot. Paths are
configured when starting the service; requests cannot choose output paths. A response containing
`accepted: true` and `jobId` means the helper owns the job even if the frontend closes. `status`
returns `pending: true` until a terminal `{ ok, error?, path?, signature? }` result is available.

The service keeps one worker active and one newest pending render. `restore` cancels queued and
active renders, pauses later automatic renders until `backup` succeeds, then restores originals.
A cancelled worker never completes a file overwrite halfway: each PNG is written through
QSaveFile. Replacement resolves existing symlinks so firmware aliases survive. A batch is not
atomic across all target files; its completion signature advances only after every output lands.
Failed or interrupted jobs retain originals and can be retried.

`backup` preserves and verifies every existing original before any image is replaced. `restore`
checks all backups before writing. Test `render`/`preview` only write `suspend-preview.png` inside
the test app. Explicit `test-write`/`test-restore` jobs manage the single device suspend image using
the test app's separate `device-suspend-original.png` backup; stable rejects these operations.

Helper state uses `.power-image-signature`; the old `.sleep-sig` is no longer consulted. It includes
the snapshot, selected targets, and a native-renderer version. Bump that version if a native shim
change affects pixels without a shared JS signature change. Helper crashes become terminal job
failures (or a client timeout); no fallback draws or encodes in QML.

Host integration tests can override `--app-dir`, `--image-dir`, `--js-dir`, and `--port` to use
temporary directories. Host builds include a test-only FIFO gate controlled by
`HABIT_TRACKER_TEST_GATE`; ARM builds omit that hook. `make responsiveness-test` proves the
service and QML remain responsive with the worker held at that gate. `make performance` measures
the real seven-image path.

## Input JSON shapes

These are the **same files the app's stores write** under its `data/` dir. ADR
[`0005-backend-shaped-entry-rows.md`](../../docs/adr/0005-backend-shaped-entry-rows.md) is the
source of truth for the shapes.

**`roster.json`** — identity + config, no entries. Array order is display order, and soft-deleted
habits trail the alive ones:

```json
{
    "habits": [
        {
            "id": "<habitId>",
            "name": "Read",
            "polarity": "Positive",
            "isPrivate": false,
            "createdAt": 1782148800000,
            "editedAt": 1782148800000,
            "deletedAt": null
        }
    ]
}
```

- `polarity` — `"Positive"` or `"Negative"`. A negative habit renders every non-future day as X
  except the ones it slipped on (`"o"`).
- `isPrivate` — when `true`, the habit is omitted from the suspend image, regardless of the
  device-local "show private habits" setting (that setting only reveals private habits on the main
  grid, never on suspend).
- `deletedAt` — non-null marks a tombstone; those rows never render.

**`YYYY-MM.json`** — one month's entries as flat `(habitId, date)` rows. `outcome` is `"x"` or
`"o"`; `deletedAt` is null while the mark is alive and holds the clear's edit-time on a tombstone:

```json
{
    "month": "2026-06",
    "entries": [
        {
            "habitId": "<habitId>",
            "date": "2026-06-01",
            "outcome": "x",
            "editedAt": 1782148800000,
            "deletedAt": null
        }
    ]
}
```

Rows whose `habitId` is absent from the roster are ignored (orphans never render), matching the
app's fold-by-id.

**Older shapes are refused, not rendered.** A roster whose habits have no `polarity`, no
`editedAt`, or no `isPrivate` (still spelling the old device-local `hideFromSleep`, or predating it
entirely), or a month whose `entries` is an object rather than an array or whose rows still spell
the edit-time `updatedAt`, exits **2** and names the file — drawing it would produce a blank or
wrong grid that reads as "no marks yet", or worse, put a private habit on the lock screen. Convert a
copy with `scripts/migrate-edited-at.mjs` and/or `scripts/migrate-is-private.mjs` first; see
[ADR 0006](../../docs/adr/0006-external-one-shot-migrations.md) and
[ADR 0007](../../docs/adr/0007-edited-at-timestamp-name.md).

## How the JS is reused

`QJSEngine` is not a full QML JS runtime, so `main.cpp`:

- strips QML's `.import` / `.pragma` lines and IIFE-wraps each module to return its named exports,
  mirroring `import "X.js" as X`. Each stripped `.import` becomes an engine global instead, so the
  modules must be loaded in `main.cpp` for their dependents to resolve at call time;
- supplies a minimal `Qt.formatDate` stand-in (the only QML global `DateUtils.js` reaches);
- injects file contents as engine globals (`rosterJson`, `monthJson`) parsed with `JSON.parse` —
  never string-concatenated into source, so quotes/newlines in data can't break the script.

**The projection is the app's, not a copy.** `main.cpp` does only what `HabitsStore` does with no
module of its own — join the month's entry rows onto the roster by habit id — then wraps the result
in a `{ count, get }` stand-in for the QML `ListModel` and calls the app's own
`HabitsModel.toSuspendHabits`. Every rule about what renders (tombstones dropped, hidden habits
skipped, which glyph a day gets) therefore lives in `HabitsModel.js` / `Entries.js` and is shared
with the running app. Reimplementing any of it here is what let this tool silently drift out of date
once already — keep the join, push everything else into the modules.

### Power-state previews

The renderer now uses Quiet ledger with aligned, compact state icons. Add `--state sleep`,
`--state off`, `--state empty`, `--state starting`, `--state rebooting`, or
`--state overheating` to select the footer; the default is `sleep`. Crash recovery uses
the `rebooting` footer because its device file can alias the normal restart image.
`--out` still chooses a single output file. The plain CLI previews a single image. Service mode owns the multi-image write lifecycle.

Rebuild this tool after the renderer update: its Canvas shim now supports filled rounded paths, scaling, text
measurement, and right-aligned labels. Copying the updated JavaScript beside an old binary is not sufficient.

Rebuild the native tool to accept the new `--state` values; its argument validation is compiled in.
