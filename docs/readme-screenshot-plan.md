# README screenshot tooling plan

## Status

The shared fixture, reMarkable offscreen renderer, mobile test target, and Expo Go/Maestro capture
wrapper are implemented. The remaining native step is user-run validation: provision a compatible
Expo Go client in the chosen AVD, run the capture command, inspect all six images, and replace the
clearly labeled AI-generated mobile concept only after the results are approved.

## Goal

Regenerate realistic README imagery without a reMarkable device, physical phone, Expo web, live
backend, credentials, or access to user data.

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
  Qt Quick host +       frozen Date  SQLite  local fetch
  suspend writer                         |
           |                Expo Go + Maestro flow
           |                         |
           +---------- validated PNGs +
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

### Production stays ordinary

Every pre-existing production file under `apps/mobile/src` matches `main`. Screens, domain
functions, query hooks, transport, authentication, database setup, and formatting code contain no
test or screenshot conditionals; all new runtime behavior lives under `src/testMode`.

`APP_TEST_MODE=1` introduces one substitution at the application boundary. Metro resolves the root
layout's `@/components/AppProviders` import to a test adapter. Before loading the production
provider, the adapter freezes implicit `Date` construction and `Date.now()` and installs a local
fetch implementation. It then wraps the real provider, waits for normal migrations, seeds the real
SQLite schema and SecureStore session, and finally renders the unchanged application screens.

Unexpected requests fail locally rather than reaching a network. The adapter is absent from the
ordinary module graph, and Expo Router remains the entry point in both modes. This is a narrow test
provider seam, not screenshot logic distributed through production features.

### Expo Go identity

Test mode changes the Expo project name and slug, fixes presentation to light mode, and removes the
production EAS project ID. The ordinary scheme, Android package, iOS bundle identifier, entry
point, provider, database code, clock, and network behavior stay unchanged. The separate Expo Go
project scope isolates test SQLite and SecureStore data without maintaining a screenshot-specific
APK target.

Manual inspection remains available:

```sh
pnpm mobile:test:fixture
pnpm mobile:test:go
```

## Automated Android capture

The user-run entry point is:

```sh
pnpm mobile:test:screenshots -- --avd Pixel_9a
```

It performs one bounded workflow:

1. regenerate mobile fixture data;
2. start test-mode Metro on a checked local port;
3. select the requested named AVD, reusing it if already running or starting it headlessly;
4. require an SDK 56-compatible Expo Go installation and add a scoped adb reverse;
5. ask Metro for its Expo Go URL;
6. run one parameterized Maestro flow across all six Expo Router routes;
7. wait for fixture-backed UI, enter the fictional pairing code, and capture each screen;
8. verify all expected images are portrait PNGs before replacing committed files;
9. remove only the adb reverse it added, stop its Metro process, and stop only an AVD it started.

`--serial emulator-5554` reuses an existing emulator and never stops it. `--keep-emulator` leaves a
newly started AVD running for diagnosis. Failed runs retain their temporary logs and Maestro
artifacts. Physical, network, offline, ambiguous, and non-QEMU targets are rejected.

The wrapper starts the named AVD with the Android emulator CLI instead of `maestro start-device`.
This keeps the already provisioned, SDK-compatible Expo Go client and a stable README device
profile. Maestro remains responsible for application-level navigation, readiness, input, and
screenshots, so the flow itself is independent of desktop keyboard or mouse automation.

Agents implement and validate the lightweight parts of this workflow but do not run Expo, Maestro,
Java, builds, installation, or emulators unless the user explicitly requests that specific heavy
operation.

## Verification

- Run `pnpm screenshots:fixtures:test` and verify generated mobile data is current.
- Run `pnpm remarkable:test` and the suspend-writer smoke test when reMarkable code changes.
- Run mobile typechecking and targeted linting.
- Verify ordinary and test Expo configs resolve to their respective project scopes.
- Confirm pre-existing `apps/mobile/src` files match `main`; only additive `testMode` files differ.
- Verify Metro delegates normally and substitutes only the provider import in test mode.
- Unit-test Expo URL construction, AVD selection, emulator-only validation, fixture rules, frozen
  time, and the complete Maestro screenshot manifest.
- When the user runs native validation, inspect every image at GitHub-rendered size and full
  resolution before replacing the AI-generated mobile placeholder.

The workflow is complete when the user-run command opens the isolated test project in Expo Go,
shows deterministic fixture data on every target screen without a backend, validates the complete
capture set before promotion, and cleans up only the resources it created.
