# README screenshot tooling plan

## Status

The shared fixture, reMarkable offscreen host, suspend-renderer integration, and real reMarkable
image set are implemented. Mobile uses an additive test target plus a user-run Node wrapper that
captures six screens from Expo Go with direct, emulator-scoped `adb` commands. The generated images
still require user review before they replace the clearly labeled AI-generated mobile concept.

## Goal

Refresh realistic README imagery without a reMarkable device, physical phone, Expo web, live
backend, credentials, or access to user data. The reMarkable workflow is automated because Qt can
host its real QML scene offscreen. Mobile supplies deterministic test state and automates emulator
navigation, readiness, pairing-code input, and capture without a native build or desktop automation.

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
           |              Expo Go on an emulator
           |                        |
           |              direct scoped adb commands
           |                        |
           +-------- validated PNGs +
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
from the test target's separate Expo project identity in Expo Go, not alternate behavior in those
modules. The adapter replaces global fetch with local pairing and device responses; unexpected
requests return a clear failure without reaching a network. Expo Router remains the package entry
point in both production and test mode.

### Frozen time

The provider adapter installs a test `Date` replacement before loading any production provider
modules. It freezes both implicit construction and `Date.now()` while preserving explicitly
constructed dates, `Date.parse`, `Date.UTC`, and real timers. The adapter does not exist in the
ordinary module graph.

Overriding only `Date.now()` would be insufficient because `new Date()` reads the system clock
independently.

### Isolated target

`APP_TEST_MODE=1` changes identity only during Expo config resolution:

- name: `Habit Tracker Test`;
- Expo slug: `habit-tracker-test`, without the production EAS project ID;

The separate Expo slug gives Expo Go its own project storage scope. The normal app retains its
existing entry, provider, name, identifiers, database, SecureStore session, clock, and network
behavior.

```sh
pnpm mobile:test:go
```

`mobile:test:go` starts Metro in Expo Go mode but does not start or select an emulator. The user opens
the project in an SDK 56-compatible Expo Go client and handles all device interaction. It remains a
manual diagnostic path; the capture workflow below starts its own test-mode Metro process.

## Automated Android capture

The user runs one of these commands after installing Expo Go in the target AVD and opening it once to
clear onboarding:

```sh
pnpm mobile:test:screenshots -- --avd Pixel_9a
pnpm mobile:test:screenshots -- --serial emulator-5554
```

`--avd` starts the named AVD with the Android emulator CLI in headless, cold-boot mode. `--serial`
selects a caller-started emulator and never stops it. Both paths reject physical, network, offline,
missing, and non-QEMU targets. The script never creates, wipes, or builds an AVD or application.

The wrapper then:

1. verifies the committed generated fixture and the required Android/Expo tools;
2. starts test-mode Metro on an available IPv4 loopback port and adds a scoped `adb reverse`;
3. opens each Expo Router path with `adb shell am start` and an Expo Go `/--/` deep link;
4. polls `uiautomator dump` for scenario-specific visible text;
5. focuses and fills the pairing-code field with `adb shell input`;
6. captures each settled view with `adb exec-out screencap -p`;
7. validates PNG structure, CRCs, decoded pixels, portrait dimensions, and distinct content before
   promoting any output.

Today, Month, Habits, Sync, Devices, and pairing are always staged as one set. There is no Maestro,
Java, Appium, xdotool, desktop interaction, or additional npm dependency.

Cleanup is ownership-aware: Metro is always stopped because the wrapper started it; only a reverse
rule added by the run is removed; only an AVD launched by the run is stopped. Failures preserve logs
and staged screenshots for diagnosis. Agents verify the wrapper without starting Expo or an
emulator; the user owns the native end-to-end run.

## Verification

- Run `pnpm screenshots:fixtures:test` and verify the generated mobile test data is current.
- Run `pnpm remarkable:test` and the suspend-writer smoke test.
- Run mobile typechecking and linting.
- Verify normal and test Expo config resolve to their respective Expo and native identities.
- Confirm all pre-existing files under `apps/mobile/src` match `main`; only additive `testMode`
  files may differ.
- Verify Metro delegates normally without `APP_TEST_MODE` and selects the provider adapter with it.
- When the user runs native validation, exercise both a named AVD and an explicit existing serial.
- Assert that every Android scenario has a direct route and stable readiness text.
- Validate complete PNG structure and decoded pixels before promoting the six-file set.
- Assert test time freezes both `new Date()` and `Date.now()` without changing explicit dates.
- Confirm feature directories contain no test- or screenshot-specific imports or conditionals.
- Inspect every committed image at GitHub-rendered size and full resolution.
- Replace the AI mobile concept only after all six native screens have been manually reviewed.

The workflow is complete when one user-run command opens the test project in Expo Go, captures the
six deterministic screens without a backend, validates the complete set, and preserves all
pre-existing emulator processes and reverse rules.
