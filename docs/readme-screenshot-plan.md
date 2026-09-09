# README screenshot tooling plan

> **Implementation status:** The shared fixture, reMarkable offscreen host, real reMarkable image
> set, isolated Android screenshot build, and serial-scoped Android runners are implemented. The
> Android release APK builds successfully; final emulator installation, route capture, and visual
> validation remain pending. Until then, the README labels its mobile/linking concept as an
> AI-generated placeholder.

## Goal

Create a small, repeatable screenshot workflow that an agent can run to refresh the README's real
product imagery without needing a reMarkable device, a physical phone, Expo web, or a live backend.
The first version should cover a fixed set of named scenarios while making another scenario cheap
to add.

The committed output set is:

| Client     | Scenario   | Intended README use                           |
| ---------- | ---------- | --------------------------------------------- |
| reMarkable | `grid`     | Main month grid with realistic marks          |
| reMarkable | `edit`     | In-app habit editing controls                 |
| reMarkable | `settings` | Suspend-image and sync settings               |
| reMarkable | `pairing`  | Tablet showing a pairing code                 |
| reMarkable | `suspend`  | The actual sleep-screen renderer's output     |
| Android    | `today`    | Daily logging and streaks                     |
| Android    | `month`    | Portrait month review                         |
| Android    | `habits`   | Habit management and ordering                 |
| Android    | `sync`     | Connected self-hosted sync/account state      |
| Android    | `pairing`  | Phone reviewing the tablet pairing request    |
| Android    | `devices`  | Linked `Pixel 9a` and `reMarkable 1` sessions |

The `suspend` scenario remains owned by the existing suspend writer. The other reMarkable
scenarios use the real Qt Quick scene through a new offscreen host.

## Decisions and boundaries

- Capture real application UI. Generated mockups may be useful for an early README layout
  prototype, but they are temporary composition references and must be replaced by these captures
  before the README claims to show the product.
- Use named scenarios, not a general UI automation language. The scenario registry is the extension
  point: add fixture state, a route/view selection, and an output name.
- Use one canonical, backend-shaped fixture and one fixed clock across both clients. Each client has
  its own adapter into its intentional persistence format; neither client imports or treats the
  other client as its model.
- Host the normal reMarkable QML scene in Qt Quick. Do not extend the suspend writer into a partial
  QML implementation: it deliberately hosts only the suspend JavaScript renderer behind a
  QPainter-backed Canvas shim.
- Continue to use the existing suspend writer for `remarkable-suspend.png`, proving that the README
  shows the same projection that writes the device's sleep image.
- Capture the mobile app from a native Android emulator. Do not restore Expo web or take browser
  screenshots.
- Do not require a live sync server. Screenshot mode supplies deterministic local responses for
  auth, pairing, and linked-device reads and must never send network requests.
- Commit the final PNGs. Regeneration is an on-demand local workflow, not a CI pixel-golden job.
- Keep all production defaults unchanged. Screenshot state is active only in an explicitly built
  screenshot variant or in the host-only Qt harness.

## Coherent sample narrative

Use a single fixture dated **2026-09-09**. The exact content can be tuned once it is rendered, but
the first pass should contain enough history to make both grids visually useful without looking
perfect or artificial.

### Identity and connection state

- User: `alex@example.com` (fictional).
- Sync server shown in settings: `https://habits.example.test`.
- Current phone: `Pixel 9a`.
- Tablet: `reMarkable 1`.
- Pairing code: `H7K9Q2`, using the backend's six-character unambiguous alphabet.
- Last successful sync: shortly before the fixed clock, so relative-time labels remain stable.
- Device-list state represents the moment after approval; pairing screenshots represent the
  immediately preceding step. This is one short narrative, not contradictory accounts.

### Habits

Start with five or six concise names that fit both layouts, for example:

1. Read 20 min — positive
2. Exercise — positive
3. Journal — positive
4. Stretch — positive
5. No sweets — negative
6. Medication — positive and private

Include a mix of successes, explicit failures, and unmarked days over the current month, plus enough
look-back history for believable streaks. Use stable UUIDs, positions, and edit timestamps. The
private habit may appear on an explicitly configured main/edit view, but it must never appear in
the suspend capture. That gives the generated assets a useful privacy check as well as visual
variety.

### Canonical fixture shape

Store the source fixture under `tools/readme-screenshots/` in backend vocabulary:

- habits use `Positive` / `Negative`, `position`, `isPrivate`, `editedAt`, and `deletedAt`;
- entries use `Success` / `Failure` and ISO date keys;
- settings, user, pairing request, and sessions are grouped separately from habit data;
- `today`, device names, and all timestamps live in the fixture rather than in capture scripts.

The reMarkable adapter materializes `roster.json`, `2026-09.json`, `settings.json`, and `sync.json`
in a temporary directory and respells outcomes to its on-disk `x` / `o` form. The Android adapter
inserts the same backend-shaped rows into an isolated SQLite database and supplies the fixture
session/API responses. Adapters should validate required fields and fail on an unknown outcome or
scenario instead of silently producing an empty screen.

## Proposed architecture

```text
tools/readme-screenshots/fixture.json
                  |
          scenario registry
             /          \
  reMarkable adapter    Android adapter
           |                 |
 temporary JSON files   isolated SQLite + local API fixtures
           |                 |
 Qt Quick offscreen host  native emulator app
           |                 |
    QImage capture        adb screencap
             \             /
          docs/assets/screenshots/*.png

fixture -> existing suspend writer -> remarkable-suspend.png
```

The root runner owns common argument parsing, output naming, and fixture validation. Platform
helpers own only platform-specific preparation and capture.

## Phase 1: shared fixture and scenario registry

1. Add a canonical fixture with the fixed clock, roster, entries, settings, account, pairing, and
   sessions described above.
2. Add a registry containing the supported scenario names, client, destination filename, and
   presentation state. Presentation state is limited to facts such as initial route, edit mode,
   pairing phase, and whether private habits are shown; domain records remain shared.
3. Validate the fixture before either platform runs. At minimum validate unique habit IDs,
   positions, `(habitId, date)` uniqueness, known polarities/outcomes, dates matching the fixed
   month where required, valid pairing-code length/alphabet, and session identity consistency.
4. Write all generated seed files to a fresh temporary directory. Never point either renderer at
   `.backup/`, device data, or the developer's normal mobile database.
5. Define stable output names under `docs/assets/screenshots/`. A full run may replace those files,
   but a failed run should leave the last committed set intact by capturing into a temporary output
   directory and moving results only after every requested scenario validates.

## Phase 2: normal reMarkable pages through Qt Quick

### Host design

Add a separate host-only tool, for example
`apps/remarkable/tools/readme-screenshots/`. It should use `QGuiApplication`, `QQuickView` (or a
`QQuickWindow` plus `QQmlComponent`), and host Qt 5.15 with `QT_QPA_PLATFORM=offscreen`. It loads the
live `src/Main.qml` and its real components instead of copying their layout.

The host creates a native reMarkable-sized scene at 1404 × 1872, waits for the selected state to be
ready, captures it, and rotates the resulting pixels once into a README-friendly 1872 × 1404
landscape PNG. The rotation happens after rendering so the app's existing portrait-container /
90-degree landscape transform is exercised exactly as it is on-device.

### Small production-default-preserving seams

`Main.qml` currently owns concrete store paths, `new Date()`, `currentView`, edit mode, and live
pairing state internally. Expose only the inputs the host needs, with today's behavior as defaults:

- clock/today;
- habit-data, settings, and sync-sidecar paths;
- initial view (`grid` or `settings`) and initial edit mode;
- optional pairing presentation override for the host (`waiting` plus code), disabled by default;
- a read-only readiness property or signal that covers loaded stores, the asynchronous grid
  `Loader`, and scenario-specific visible content.

The pairing override must affect presentation only and suppress `PairingStore` polling in the host.
It must not mint or persist a token. Normal app startup continues to use real paths, the system
clock, grid/non-edit defaults, and the live store.

If exposing these inputs directly makes `Main.qml` noisy, put them into a small injected
environment/config object. Do not duplicate `Main.qml` into a screenshot-only scene; that would
produce screenshots which can drift from the shipped app.

### Readiness and capture

Do not use a fixed sleep as the primary readiness mechanism. The host should wait for:

- habit, settings, and sync stores to report loaded;
- the grid `Loader` to reach `Loader.Ready` for `grid` and `edit`;
- the settings component and requested pairing state to be visible for `settings` and `pairing`;
- at least one completed render frame after readiness, ensuring fonts and bindings have settled.

Apply a bounded timeout and report which condition did not become ready. Disable sync, pairing
polling, suspend writes, backup/restore, and quit behavior in the host so a capture is side-effect
free. It must not read or write the device's absolute paths.

### Suspend capture

The root runner separately builds and invokes the existing host suspend writer using the
reMarkable-native temporary fixture files:

```sh
apps/remarkable/tools/suspend-writer/build/suspend-writer \
  --roster <tmp>/roster.json \
  --month <tmp>/2026-09.json \
  --today 2026-09-09 \
  --out <staging>/remarkable-suspend.png
```

No new page-rendering responsibilities belong in `tools/suspend-writer/main.cpp`.

## Phase 3: deterministic mobile screenshot mode

Build one Android screenshot variant with an explicit flag such as
`EXPO_PUBLIC_README_SCREENSHOTS=1`. In this variant only:

1. `AppProviders` uses a distinct database name such as `habits-readme.db`.
2. After normal Drizzle migrations and before screens render, a screenshot seeder transaction
   clears that isolated database and inserts the canonical fixture's habits, entries, and settings.
3. The clock abstraction returns `2026-09-09` so Today, Month, streak, and relative-time output is
   stable. Production builds continue to call the real clock.
4. Auth session reads return the fixture user/token without writing to the developer's SecureStore.
5. API reads used by pairing and devices return typed fixture responses in-process. Mutating or
   unexpected requests fail clearly. Screenshot mode performs no fetches.
6. The pairing route starts with `H7K9Q2` already entered and the lookup resolved to
   `reMarkable 1`; show the pre-approval state with the **Approve** action. The device-list route
   shows both sessions after approval.

Keep this behind a small screenshot configuration/data seam rather than scattering environment
checks across every screen. Screens should still render their real components and query hooks.
Prefer injecting the clock, initial pairing value, auth storage, and API transport at their existing
boundaries. Do not fork copies of the Today, Month, Habits, Sync, Pairing, or Devices components.

The screenshot build should be unmistakable in logs and must use a package/application identifier
or database name that cannot overwrite ordinary development data. It is acceptable for the same
development app package to be used if the capture preflight verifies screenshot mode and the
database/session stores are isolated; a dedicated Android application ID suffix is safer if Expo's
configuration supports it without complicating local builds.

## Phase 4: Android navigation and capture

Use the existing `habittracker` URL scheme and Expo Router paths to select the real screen after the
screenshot build is installed. The runner maps names to routes:

- `today` → `/`
- `month` → `/month`
- `habits` → `/habits`
- `sync` → `/sync`
- `pairing` → `/link-device`
- `devices` → `/devices`

For each scenario, launch the deep link with `adb -s <serial>`, wait for a screenshot-mode
ready marker, capture via `adb exec-out screencap -p`, and validate the PNG before moving it into
the staging set. A ready marker can be a small screenshot-only native log line or an accessibility
identifier reached through `uiautomator dump`; avoid coordinate taps and arbitrary delays as the
main synchronization mechanism.

Normalize the emulator before capture:

- fixed Pixel profile and API level documented in the tool README;
- portrait orientation and fixed resolution/density;
- light theme, stable font scale, English locale, and hidden keyboard;
- status/navigation bar policy chosen once and applied to all captures;
- animations disabled for the capture session, with prior values restored if the script changes
  them.

Do not crop individual screens inconsistently. Preserve raw emulator screenshots for the gallery;
build any device frames or hero composite as separate derived assets.

## Emulator safety contract

The capture command operates only on an already-running local Android emulator and never starts an
AVD implicitly. An agent may start the requested AVD as a separate, visible step when the user has
explicitly asked it to run or capture the mobile UI; the existing rule exists to prevent agents
from spinning up emulators without that permission.

The preflight must:

1. Require `--serial <serial>` (or accept auto-selection only when exactly one running target is
   present).
2. Confirm the serial begins with `emulator-` and verify `adb shell getprop ro.kernel.qemu` is `1`.
3. Reject physical devices, Wi-Fi ADB targets, multiple ambiguous targets, offline targets, and an
   absent screenshot-mode build.
4. Scope every `adb` call with `-s <serial>`; never rely on adb's default target selection.
5. Never call `emulator`, create/delete an AVD, wipe emulator data, run an EAS/cloud build, touch a
   physical device, or contact the reMarkable. Starting an explicitly requested existing AVD is a
   separate agent step, outside the capture runner.
6. Print the validated serial, model, API level, package, and intended output paths before capture.

Updating `apps/mobile/CLAUDE.md` should be narrow: agents may run the documented capture workflow
against a validated local emulator when the user explicitly requested UI execution or capture. The
broader native-only and no-Expo-web rules remain intact.

## CLI contracts

Expose a root entry point with platform and scenario filters. Exact script language is an
implementation choice, but the user-facing contract should be stable:

```sh
# Build/render every host-side reMarkable image, including suspend.
pnpm run screenshots:remarkable

# Render one named reMarkable page.
pnpm run screenshots:remarkable -- --scenario pairing

# Capture all Android scenarios from an already-running emulator.
pnpm run screenshots:android -- --serial emulator-5554

# Capture one Android route.
pnpm run screenshots:android -- --serial emulator-5554 --scenario devices

# Refresh everything once the screenshot-mode Android app is installed.
pnpm run screenshots -- --serial emulator-5554
```

Supported common options:

- `--scenario <name>`: one registered scenario; omitted means all scenarios for that platform.
- `--fixture <path>`: defaults to the committed canonical fixture.
- `--out-dir <path>`: defaults to `docs/assets/screenshots`; useful for review without replacing
  committed assets.
- `--serial <adb-serial>`: required by Android as described above and invalid for reMarkable.
- `--keep-temp`: retain materialized fixture files and staged output for diagnosis.

Unknown flags/scenarios, a mismatched platform, or `--out` with an all-scenarios run should fail
with usage text. The lower-level Qt host can additionally expose:

```sh
readme-screenshot \
  --scenario grid \
  --data-dir <tmp>/remarkable \
  --today 2026-09-09 \
  --out <staging>/remarkable-grid.png
```

The root runner, not the user, normally supplies those lower-level paths.

## Expected files affected during implementation

Names may adjust to the repository's conventions, but ownership should remain clear.

### New shared tooling and assets

- `tools/readme-screenshots/fixture.json` — canonical sample narrative.
- `tools/readme-screenshots/scenarios.*` — named registry and output mapping.
- `tools/readme-screenshots/*` — fixture validation/adapters and root orchestration.
- `docs/assets/screenshots/*.png` — committed raw captures and, later, separately derived hero
  composition.
- `tools/readme-screenshots/README.md` — dependencies, emulator preparation, CLI examples, and how
  to add a scenario.

### reMarkable

- `apps/remarkable/src/Main.qml` — default-preserving host inputs and readiness surface.
- Potentially `HabitsStore.qml`, `SettingsStore.qml`, or `SyncStore.qml` only if their paths cannot
  be injected cleanly through `Main.qml`; avoid broader behavior changes.
- `apps/remarkable/tools/readme-screenshots/main.cpp` — Qt Quick offscreen host.
- `apps/remarkable/tools/readme-screenshots/ScreenshotHost.qml` — window/readiness/capture glue if
  C++ alone is less clear.
- `apps/remarkable/tools/readme-screenshots/build-host.sh` and Makefile targets — host build and
  smoke test.
- `apps/remarkable/application.qrc` only if a production QML helper is added; host-only files do not
  belong in the deployed resource.
- Tests covering production defaults and scenario readiness.

The existing suspend-writer source should be unchanged unless an independent bug is found. Its
existing build/test target is reused.

### Mobile

- `apps/mobile/src/screenshots/*` — explicit configuration, fixture seed adapter, and typed local API
  responses.
- `apps/mobile/src/components/AppProviders.tsx` — isolated database selection and post-migration
  seeding gate.
- A small clock module plus replacement of direct current-time reads in the screens/domain paths
  that affect these captures.
- Existing auth/API boundaries for injectable screenshot implementations, without editing
  generated `src/api/gen/` files.
- `apps/mobile/src/app/link-device.tsx` — injected initial pairing code through the centralized
  screenshot configuration.
- `apps/mobile/app.json` or an app config file only if an Android application-ID suffix is adopted.
- `apps/mobile/CLAUDE.md` — narrowly document already-running-emulator capture permission and
  safety.
- Unit tests for fixture seeding, clock selection, mock response typing, and production defaults.

### Root

- `package.json` — `screenshots`, `screenshots:remarkable`, and `screenshots:android` scripts.
- The polished root `README.md` — references committed assets after they exist.
- `.gitignore` only for well-scoped temporary/build directories; committed PNGs must remain
  visible to Git.

## Verification

### Fixture and cross-client consistency

- Validate the canonical fixture before every run.
- Assert both adapters preserve habit IDs, order, polarity, privacy, dates, and semantic outcomes.
- Assert the reMarkable `x` / `o` conversion round-trips to the canonical
  `Success` / `Failure` values.
- Assert the pairing screenshot names `reMarkable 1` and the devices screenshot contains both
  `reMarkable 1` and `Pixel 9a`.
- Assert the private habit is absent from the suspend projection.

### reMarkable

- Run the new host smoke test for all four normal-page scenarios.
- Run `make test` from `apps/remarkable/`.
- Run `make suspend-writer-test` and render `suspend` from the new fixture.
- Verify every output is a decodable, nonblank PNG with the expected 1872 × 1404 dimensions.
- Capture the same scenario twice and compare bytes where the host environment is identical; if
  font rendering introduces nondeterminism, compare dimensions/content bounds and investigate
  unexpected changes visually rather than creating a cross-machine golden.
- Confirm no files were written outside the temporary fixture/output directories.

### Android

- Run `pnpm typecheck` and `pnpm lint` from `apps/mobile/`.
- Test production mode selects `habits.db`, the real clock, SecureStore, and the real API transport.
- Test screenshot mode selects the isolated DB and rejects any unhandled network operation.
- Run preflight tests against parsed `adb devices` fixtures covering one emulator, physical USB,
  Wi-Fi device, multiple devices, offline emulator, and `ro.kernel.qemu != 1`.
- Capture all six scenarios twice after reseeding and compare dimensions plus stable image hashes
  on the documented emulator image.
- Verify output is portrait, nonblank, contains no keyboard, and shows no loading spinner, toast,
  modal, debug overlay, or red error screen.

### README review

- Inspect raw screenshots at GitHub-rendered size as well as full resolution.
- Check that pair-code, approval, and linked-device images read as a sequence.
- Check that the hero derivative does not obscure or materially alter the real UI.
- Keep raw captures available below the hero so readers can distinguish product evidence from
  presentation framing.

## Risks and mitigations

| Risk                                                                | Mitigation                                                                                                                                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QML renders before async stores or the grid loader settle           | Expose explicit scenario readiness, wait one additional frame, and fail with a bounded diagnostic timeout.                                                                   |
| Qt's offscreen plugin differs from xochitl/e-ink                    | Use the exact QML scene, native dimensions, Qt 5.15, grayscale UI, and treat host font rasterization as approximate. Keep suspend rendering on its existing shared renderer. |
| Screenshot seams leak into production behavior                      | Give every seam current behavior as its default and test production configuration separately. Gate mobile mode explicitly.                                                   |
| Fixture adapters become a second domain model                       | Define the fixture in backend vocabulary, keep adapters mechanical, validate round trips, and do not import one client from the other.                                       |
| Android screenshots depend on a backend or credentials              | Use an isolated database, fixture auth storage, and typed in-process API responses; fail any unexpected request.                                                             |
| Capture touches a developer's physical device or starts an emulator | Require a scoped adb serial, verify QEMU twice, reject non-emulators, and never invoke the emulator or EAS commands.                                                         |
| Screenshot run destroys ordinary mobile state                       | Use a distinct DB and auth implementation (preferably an application-ID suffix), never `pm clear`, and reject an app that is not in screenshot mode.                         |
| Deep links arrive before fixture setup                              | Gate the router behind migration + seed completion and expose an explicit ready marker.                                                                                      |
| Pixel comparisons become flaky across Qt/Android/font versions      | Pin/document the capture environments; keep CI to functional checks initially and review committed image diffs visually.                                                     |
| README assets drift after UI changes                                | Make regeneration one documented command per client and include the scenario registry in UI-change review guidance.                                                          |
| Generated mockups are mistaken for real screenshots                 | Label them as prototypes while iterating and remove/replace them when real captures land.                                                                                    |

## Suggested delivery slices

1. **MVP fixture and reMarkable capture:** canonical fixture, Qt host, `grid`/`edit`/`settings`/
   `pairing`, existing suspend writer integration, and committed outputs.
2. **MVP Android capture:** isolated screenshot build, deterministic seed/clock/API fixtures, safe
   adb runner, all six named scenarios, and committed outputs.
3. **README composition:** raw galleries, the three-step pairing story (tablet code, phone approval,
   linked devices), restrained hero composite, and captions.
4. **Hardening:** tests for safety/defaults, output staging/atomic replacement, dependency docs, and
   a concise "add a scenario" recipe.

The MVP is complete when an agent can refresh every named image from host Qt plus an
already-running Android emulator, without Expo web, a live backend, a reMarkable connection, or
access to non-fixture user data.
