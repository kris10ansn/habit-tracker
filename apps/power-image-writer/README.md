# Power-state image writer

A standalone C++17 application using Qt Core/Gui. It reads the reMarkable app's saved JSON and
renders all power-state images with QPainter/QImage. It needs no frontend resource bundle, QML,
Canvas, or JavaScript engine. The same binary serves apploader requests and a standalone CLI.

```text
QML stores → confirmed saved JSON → immutable snapshot → QPainter → verified PNG/BMP files
                       ↑
         AppLoad request or standalone CLI
```

`Model` validates the device JSON and applies only rendering-related habit rules. `Renderer` owns
all grid, badge, icon, and boot-image drawing. `Writer` selects targets, retains backups, installs
images, and commits signatures. `Files` is the injected I/O boundary; `LocalFiles` uses QSaveFile
and full readback verification, following existing image symlinks without replacing the aliases.
`AppLoadConnection` hides socket framing behind Qt events. `AppLoadSession` owns job lifetime,
locks, and one worker thread. `WriterProtocol` converts wire JSON to typed requests and progress;
`Writer` does not construct transport messages. `RenderedImages` keeps each batch's drawing and
encoding cache together. Start with the [code tour](docs/code-tour.md) for a reading order and
C++ concepts explained using C#/Kotlin terminology.
No dependency-injection container is needed: constructors supply file access and environment,
while rendering takes values and returns images.

The interactive grid, habit edits, and sync remain in the QML app. A small set of habit rules
(private/deleted habits, deleted entries, polarity, and marks) exists in both languages.
`tests/habit-contract.json` supplies shared expectations to native tests and the frontend's
`tst_writercontract.qml`. See [ADR 0009](../remarkable/docs/adr/0009-independent-power-state-image-writer.md).

[Before/after previews of all six states](docs/render-verification.md) document visual preservation.
[Host performance measurements](docs/performance.md) compare the old worker, initial native writer,
and readability refactor, with raw samples and reproduction commands.

## Local build and verification

```sh
./scripts/build-host.sh
ctest --test-dir build/host --output-on-failure
clang-format --dry-run --Werror src/*.cpp src/*.h tests/writer_tests.cpp
make -C ../remarkable test
```

Host builds require CMake, a C++17 compiler, Qt 5 Core/Gui development headers, and Python 3 for
process tests. CTest runs both `writer-tests` (in-process C++) and `writer-process-tests`
([host-only Python harness](tests/process_tests.py)). Python is not deployed or used by the app.
CMake also supports Qt 6 (`-DPOWER_IMAGE_QT_MAJOR=6`). `build-host.sh` enables
`POWER_IMAGE_HOST_TEST`, allowing disposable fixture directories; production builds omit it.

`./scripts/build-device.sh` cross-compiles locally with the reMarkable ARM/Qt 6 SDK. Set
`REMARKABLE_SDK` to the unpacked SDK root. For existing installations the default is still
`../remarkable/tools/suspend-writer/sdk`. It never contacts the tablet. The frontend's `make build`
packages this binary as `backend/entry`, with `writer-profile.json` beside the frontend manifest.
Host and ARM builds use the same CMake source list. CMake runs Qt's `moc` automatically for the
connection's signals, using host tools even while compiling for ARM. `WRITER_BUILD_JOBS` controls
parallel compilation (default 4). The target requires Qt 6 Core/Gui and the offscreen platform
plugin; it does not require Qt Quick.

From `apps/remarkable`, use `make power-image-writer-host`, `power-image-writer-device`,
`power-image-writer-test`, or `power-image-writer-clean`. The old `image-worker-*` and
`suspend-writer-*` local targets remain aliases. From the repository root, use
`pnpm remarkable:test:images`.
Deploy the frontend, writer, and profile together using the app's normal user-run deployment.

## Standalone CLI

Close the app before standalone commands. A session lock refuses concurrent CLI use while its
AppLoad writer is alive. This is a small CLI integration policy, separate from the rendering
library; it can be replaced when concurrent or scheduled use is designed. A second lock excludes
simultaneous device-image operations across stable and test installations. Do not launch the app
while a standalone command is running; normal habit editing does not participate in this lock.

```sh
# Host preview using repository fixtures; --app-dir must be an existing writable directory.
build/host/power-image-writer preview --app-dir /tmp \
  --roster ../remarkable/tests/fixtures/roster.json \
  --month ../remarkable/tests/fixtures/2026-08.json --date 2026-08-09 \
  --state sleep --out /tmp/suspend-preview.png

# On the tablet, user-run with the app closed:
./backend/entry render --app-dir /home/root/xovi/exthome/appload/habit-tracker
./backend/entry restore --app-dir /home/root/xovi/exthome/appload/habit-tracker
./backend/entry check-runtime
```

`preview` accepts `sleep`, `off`, `empty`, `starting`, `rebooting`, or `overheating`. It writes only
an explicit PNG outside device-image and habit-data directories. Omit `--roster`/`--month` to use
the app's data. Missing month data means an empty month; malformed data is refused.
`render` requires persisted `suspendImageEnabled: true` and no pending restoration. `backup`
retains all selected originals. `restore` requires writing disabled and preflights every backup;
it does not edit settings. If the app records pending restoration, its Retry action also clears
that flag after verified restore. The installed `writer-profile.json` also governs CLI commands; a test install keeps automatic
outputs in its app-local suspend preview. `--test-profile` applies the same restriction to a
standalone directory. `check-runtime` renders in memory and makes no file changes.

## Saved data and lifecycle

Inputs are `data/roster.json`, `data/YYYY-MM.json`, and `settings.json` under the app directory.
The parser accepts the current device shape only; schema changes follow the frontend's external
migration policy. Private habits are always excluded, regardless of the interactive visibility
setting. All outputs in a batch use the same date and immutable snapshot.

The frontend drains both store write queues, checks save errors, and fingerprints the exact
saved files in one UI turn. Protocol version 2 sends `date` and `expected: {roster, month}` (MD5
hex digests; `month: "missing"` for an absent month). The worker reads the files once and verifies
the fingerprints before any image installation. A mismatch returns `superseded` for a fresh
request. Fingerprints are change detectors, not authentication. No serialized habit model or
caller-selected output path crosses AppLoad.

AppLoad starts `backend/entry <socket-path>` with the app directory as its working directory.
The profile is read there; the production binary fixes device-image paths. Requests carry
`version`, `id`, and `operation`; replies are `ready`, `heartbeat`, `captured`, `progress`, and
`done`. Rendering progress includes `imageProgress: {path, remainingImages}` before each image;
the count excludes the current image and includes only selected targets. Operations are render,
backup, restore, and the five test-build developer actions. The native framing remains compatible
with rm-appload's sequenced-packet transport.

Normal Quit waits for saves, sync, and the newest image batch. An accepted batch continues after
frontend detach or socket loss; the worker exits when finished. A timeout in the frontend reports
failure and never falls back to rendering on the UI thread. Scheduling and immediate-close Quit
are deliberately outside this change.

## Installation guarantees

The common grid is drawn once per batch; identical states reuse encoded output. System paths,
optional screens, boot BMP validation, and original-backup names match the frontend's previous
pipeline. Boot writes require the verified reMarkable 1 layout. The first render per worker
session refreshes images; later identical batches are skipped only after complete success.
Partial failure invalidates the cache, and the signature is saved after every selected image.

Enabling saves originals before persisting opt-in. Disabling persists off plus pending restoration
before restoring, and only verified restoration clears pending. A failure leaves the retry action
available after restart. A batch is not a transaction across files: a late failure may leave a mix
of old and new images until retry, while retained originals remain available. Device runtime and
e-ink appearance must be checked on the tablet after user-run deployment.
