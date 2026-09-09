# README screenshot tooling plan

## Status

The shared fixture, reMarkable offscreen host, suspend-renderer integration, and real reMarkable
image set are implemented. Mobile now uses an additive test target and a manual capture workflow.
The Expo Go test project must still be opened and visually reviewed by the user before its images
replace the clearly labeled AI-generated mobile concept. README presentation copies are fitted into
stable device frames derived from that concept; raw captures remain available separately.

## Goal

Refresh realistic README imagery without a reMarkable device, physical phone, Expo web, live
backend, credentials, or access to user data. The reMarkable workflow is automated because Qt can
host its real QML scene offscreen. Mobile supplies deterministic test state but leaves navigation
and screenshot timing to a person.

| Client     | Scenario   | Intended README use                        |
| ---------- | ---------- | ------------------------------------------ |
| reMarkable | `grid`     | Main month grid with realistic marks       |
| reMarkable | `edit`     | In-app habit editing                       |
| reMarkable | `settings` | Suspend and sync settings                  |
| reMarkable | `pairing`  | Tablet showing a pairing code              |
| reMarkable | `suspend`  | Production sleep-screen renderer output    |
| Android    | `today`    | Daily logging and streaks                  |
| Android    | `month`    | Portrait month review                      |
| Android    | `habits`   | Habit management and ordering              |
| Android    | `sync`     | Connected account and sync state           |
| Android    | `pairing`  | Phone reviewing the tablet pairing request |
| Android    | `devices`  | Linked phone and tablet sessions           |

## Architecture

```text
tools/readme-screenshots/fixture.json
                  |
        validation + scenarios
             /          \
  reMarkable adapter    generated mobile test data
           |                        |
 temporary JSON files        test-only provider
           |                  /       |       \
  Qt Quick host +       frozen Date  fixture  local fetch
  suspend writer                         |
           |            manually operated test app
           |                        |
           +-------- committed PNGs +
```

The fixture uses backend vocabulary. Client adapters only translate into their intentional storage
shapes; neither client treats the other as a model.

## Deterministic fixture

The fictional story is dated **2026-09-09** and contains:

- `alex@example.com`, a `Pixel 9a`, a `reMarkable 1`, and pairing code `H7K9Q2`;
- six positive and negative habits with a believable mix of successes and failures;
- enough current-month history to populate the grid and streaks;
- one private habit that appears in the app but is excluded from the suspend image;
- stable IDs, positions, edit timestamps, connection settings, and session activity.

Validation rejects duplicate IDs and positions, duplicate entry identities, unknown polarities or
outcomes, future entries, invalid pairing codes, and inconsistent current-session state. Generated
files are written only to test or temporary locations.

## reMarkable rendering

Normal pages use the live `apps/remarkable/src/Main.qml` scene through a host Qt 5.15 offscreen
application. `Main.qml` exposes default-preserving inputs for paths, date, initial view, editing,
pairing presentation, and readiness. Host mode suppresses sync, pairing polling, suspend writes,
backup/restore, and quit behavior.

The host renders at the tablet's native size, waits for stores and the requested page, captures one
settled frame, and rotates it into README-friendly landscape orientation. The `suspend` scenario
continues to use the existing production suspend writer rather than teaching that renderer about
QML pages.

```sh
pnpm screenshots:remarkable
pnpm screenshots:remarkable -- --scenario pairing
```

Captures stage to a temporary directory and replace committed outputs only after the requested set
succeeds. The capture command also regenerates each README-ready device-framed copy. Existing raw
captures can be reprocessed with `pnpm screenshots:frame`; `pnpm screenshots:linking` refreshes the
three-device scene and preserves concept pixels for mobile slots that do not have real captures yet.

## Mobile test target

### Clean seam

Every pre-existing production file under `apps/mobile/src` matches `main`. Screens, domain
functions, query hooks, transport, authentication, database setup, and formatting code contain no
test or screenshot conditionals; the new files live under `src/testMode`.

`APP_TEST_MODE=1` introduces one test-time substitution outside that code:

1. Metro resolves the root layout's `@/components/AppProviders` import to a test adapter. Before
   loading the production provider, that adapter installs the frozen clock and local fetch. It then
   wraps the real provider, waits for its normal migrations, and seeds the fixture before allowing
   screens to render.

The adapter writes to the real `habits.db` and SecureStore used by production code. Isolation comes
from the test target's separate Expo project identity in Expo Go or native application identity in
a standalone build, not alternate behavior in those modules. The adapter replaces global fetch with
local pairing and device responses; unexpected requests return a clear failure without reaching a
network. Expo Router remains the package entry point in both production and test mode.

### Frozen time

The provider adapter installs a test `Date` replacement before loading any production provider
modules. It freezes both implicit construction and `Date.now()` while preserving explicitly
constructed dates, `Date.parse`, `Date.UTC`, and real timers. The adapter does not exist in the
ordinary module graph.

Overriding only `Date.now()` would be insufficient because `new Date()` reads the system clock
independently.

### Isolated targets

`APP_TEST_MODE=1` changes identity only during Expo config resolution:

- name: `Habit Tracker Test`;
- Expo slug: `habit-tracker-test`, without the production EAS project ID;
- package/bundle ID: `no.silli.habittracker.test`;
- scheme: `habittracker-test`.

The separate Expo slug gives Expo Go its own project storage scope. The package/bundle ID gives the
optional standalone build its own native sandbox. The normal app retains its existing entry,
provider, name, identifiers, database, SecureStore session, clock, and network behavior.

```sh
pnpm mobile:test:fixture
pnpm mobile:test:go
```

`mobile:test:go` starts Metro in Expo Go mode but does not start or select an emulator. The user opens
the project in an SDK 56-compatible Expo Go client and handles all device interaction.

## Manual Android capture

Open the test project in Expo Go and navigate Today, Month, Habits, Sync, Link device, and Devices
normally. Type the fixture pairing code when capturing Link device. Use Android Studio's screenshot
control to capture the current screen.

If a standalone APK is specifically needed, build it without starting an emulator:

```sh
pnpm mobile:test:build
```

Then start and authorize an existing emulator yourself. Installation requires its explicit serial:

```sh
pnpm mobile:test:install -- --serial emulator-5554
```

The APK-only helper can save the currently visible screen with:

```sh
pnpm mobile:test:capture -- --serial emulator-5554 --name devices
```

The helper selects only the destination name. It does not launch an emulator, deep-link, click,
alter device settings, use desktop input automation, or decide that a screen is visually ready.

Both install and capture:

1. require a caller-supplied `--serial`;
2. require an `emulator-*` serial in adb's `device` state;
3. verify `ro.kernel.qemu=1`;
4. scope every adb call with that serial;
5. reject physical, network, offline, missing, and non-QEMU targets.

No tool creates, deletes, starts, stops, or wipes an AVD. No tool contacts a reMarkable or cloud
build service. Agents do not start Expo, build the APK, install it, or run an emulator without an
explicit request for that specific operation.

## Verification

- Run `pnpm screenshots:fixtures:test` and verify the generated mobile test data is current.
- Run `pnpm remarkable:test` and the suspend-writer smoke test.
- Run mobile typechecking and linting.
- Verify normal and test Expo config resolve to their respective Expo and native identities.
- Confirm all pre-existing files under `apps/mobile/src` match `main`; only additive `testMode`
  files may differ.
- Verify Metro delegates normally without `APP_TEST_MODE` and selects the provider adapter with it.
- When the user runs native validation, exercise the Expo Go project identity and, if needed, the
  separate standalone application identity.
- Assert test time freezes both `new Date()` and `Date.now()` without changing explicit dates.
- Confirm feature directories contain no test- or screenshot-specific imports or conditionals.
- Inspect every committed image at GitHub-rendered size and full resolution.
- Replace the AI mobile concept only after all six native screens have been manually reviewed.

The workflow is complete when the test project can be opened in Expo Go, shows deterministic fixture
data on every target screen without a backend, and lets a person capture the current screen without
exposing normal app state or automating their desktop.
