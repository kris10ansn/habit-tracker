# README screenshot tooling plan

## Status

The shared fixture, reMarkable offscreen host, suspend-renderer integration, and real reMarkable
image set are implemented. Mobile now uses a reusable test runtime and a manual capture workflow.
The Android test APK must still be installed and visually reviewed on an already-authorized
emulator before its images replace the clearly labeled AI-generated mobile concept.

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
 temporary JSON files        mobile test runtime
           |                  /      |       \
  Qt Quick host +       isolated DB  session  local fetch
  suspend writer              |
           |            manually operated app
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
succeeds.

## Mobile test mode

### Clean seam

Feature screens, domain functions, query hooks, and formatting code keep their ordinary `new Date()`
and `Date.now()` calls and contain no screenshot conditionals. Variation is concentrated at startup
and three existing infrastructure seams:

| Runtime capability | Production adapter | Test adapter                          |
| ------------------ | ------------------ | ------------------------------------- |
| Database           | `habits.db`        | `habits-test.db`, reset after migrate |
| Session storage    | SecureStore        | In-memory fictional session           |
| Fetch              | Network fetch      | Local pairing/device responses        |

The `AppRuntime` interface contains only those capabilities. Query modules continue to call the
ordinary session and generated backend clients; those modules delegate to the selected adapter.
Unexpected test-mode requests throw before any network operation.

### Frozen time

Expo Router loads through a custom entry point. When `EXPO_PUBLIC_APP_MODE=test`, that entry installs
a test-only `Date` replacement before importing `expo-router/entry`. It freezes both implicit
construction and `Date.now()` while preserving explicitly constructed dates, `Date.parse`,
`Date.UTC`, and real timers. Production startup installs nothing.

Overriding only `Date.now()` would be insufficient because `new Date()` reads the system clock
independently.

### Isolated build

`APP_TEST_BUILD=1` changes native identity only during Expo config resolution:

- name: `Habit Tracker Test`;
- package/bundle ID: `no.silli.habittracker.test`;
- scheme: `habittracker-test`.

The normal app retains its existing name, identifiers, database, SecureStore session, real clock,
and network behavior.

```sh
pnpm mobile:test:fixture
pnpm mobile:test:build
```

Building produces a local x86_64 release APK. It does not start or select an emulator.

## Manual Android capture

Start and authorize an existing emulator yourself. Installation requires its explicit serial:

```sh
pnpm mobile:test:install -- --serial emulator-5554
```

Navigate Today, Month, Habits, Sync, Link device, and Devices normally. Type the fixture pairing code
when capturing Link device. Use Android Studio's screenshot control, or save only the currently
visible screen with:

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
build service.

## Verification

- Run `pnpm screenshots:fixtures:test` and verify the generated mobile test data is current.
- Run `pnpm remarkable:test` and the suspend-writer smoke test.
- Run mobile typechecking and linting.
- Verify normal and test Expo config resolve to their respective identities.
- Export or build both production and test native bundles to exercise the custom entry point.
- Assert test time freezes both `new Date()` and `Date.now()` without changing explicit dates.
- Confirm feature directories contain no screenshot-specific imports or conditionals.
- Inspect every committed image at GitHub-rendered size and full resolution.
- Replace the AI mobile concept only after all six native screens have been manually reviewed.

The workflow is complete when the test app can be installed on an already-authorized emulator,
shows deterministic fixture data on every target screen without a backend, and lets a person capture
the current screen without exposing normal app state or automating their desktop.
