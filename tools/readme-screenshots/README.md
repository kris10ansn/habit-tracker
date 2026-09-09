# README screenshot tools

These tools regenerate the real application images committed under
`docs/assets/screenshots/`. Both clients consume the fictional, backend-shaped story in
`fixture.json`, dated 2026-09-09. No live backend, account, reMarkable, or user database is used.

## reMarkable captures

Install host Qt 5.15 development packages and ImageMagick, then run:

```sh
pnpm screenshots:remarkable
pnpm screenshots:remarkable -- --scenario pairing
```

The normal pages come from the live `apps/remarkable/src/Main.qml` scene through an offscreen Qt
Quick host. The suspend image still comes from the production suspend renderer; the tool only
rotates its framebuffer-oriented result for readable README presentation.

## Mobile captures through Expo Go

Mobile's existing application source is unchanged. With `APP_TEST_MODE=1`, Metro replaces only the
root layout's `AppProviders` import with a test adapter. Before that adapter loads the production
provider, it freezes implicit `Date` construction and `Date.now()` and replaces the global fetch
implementation. It then wraps the real provider, seeds SQLite and SecureStore after migrations,
answers device and pairing reads locally, and rejects unexpected requests before they reach a
network. Expo Router remains the package entry point in both modes.

The capture wrapper is a user-run tool. Agents do not start Expo or an emulator while developing or
verifying it.

### Prerequisites

- Run `pnpm install` at the repository root.
- Install Android SDK Platform Tools and put `adb` on `PATH`, or set `ANDROID_HOME` or
  `ANDROID_SDK_ROOT`.
- For `--avd`, install the Android Emulator command-line tool and create a portrait AVD with an SDK
  56-compatible Expo Go client. Open Expo Go once yourself to clear any onboarding prompt.
- For `--serial`, start an existing local Android emulator and find its serial with `adb devices`.

The tool does not build an app, install Expo Go, create or wipe an AVD, use a physical device, or
contact a backend.

### Capture all six screens

Start a named AVD headlessly for this run:

```sh
pnpm mobile:test:screenshots -- --avd Pixel_9a
```

Or reuse a running emulator without stopping it afterward:

```sh
pnpm mobile:test:screenshots -- --serial emulator-5554
```

The command checks the generated fixture, starts test-mode Metro on an available IPv4 localhost
port, adds an emulator-scoped `adb reverse`, and opens Expo Go with direct `adb` deep links. It waits
for scenario-specific text in Android's UI hierarchy, enters `H7K9Q2` into the pairing screen with
`adb input`, and captures Today, Month, Habits, Sync, Devices, and pairing with `adb screencap`.
There is no desktop interaction layer, native build, Maestro, Appium, Java, or added npm dependency.

Every `adb` command is scoped to the selected `emulator-*` serial, which must also report
`ro.kernel.qemu=1`. Physical, network, offline, missing, and non-QEMU targets are rejected. A named
AVD is launched with `-no-window`, `-no-audio`, `-no-boot-anim`, and `-no-snapshot`; an existing
serial is never stopped.

All six PNGs remain in a temporary staging directory until they have valid PNG chunks and checksums,
decodable nonblank pixels, matching portrait dimensions, and distinct content. Only then are they
promoted to `docs/assets/screenshots/`. Metro, an `adb reverse` created by the run, and a named AVD
started by the run are cleaned up. Pre-existing emulators and reverse rules are preserved. Failed
runs preserve their Metro/emulator logs and staged files at the path printed in the error.

Use `--port <port>` to require a particular Metro port, `--out-dir <path>` to capture elsewhere, or
`--keep-temp` to preserve successful-run logs. Normal output reports connection and UI-readiness
progress. Add `--verbose` to also stream Metro output and log every subprocess command:

```sh
pnpm mobile:test:screenshots -- --serial emulator-5554 --verbose
```

On failure, the retained directory includes the Metro log plus a screenshot, UI hierarchy, and
foreground-window dump for the failed scenario. `pnpm mobile:test:go` remains available for
manually inspecting the isolated test project without running the capture wrapper.

## Changing the fixture or scenarios

1. Edit `fixture.json` in backend vocabulary and add any scenario metadata to `scenarios.mjs`.
2. Run `pnpm mobile:test:fixture` to refresh the generated mobile test data.
3. Add reMarkable presentation state or Android route/readiness text to the scenario registry.
4. Run `pnpm screenshots:fixtures:test`, the platform checks, and review new captures manually.

Fixture validation rejects duplicate identities and positions, unknown polarity/outcome spellings,
future entries, ambiguous pairing codes, and inconsistent session state. Generated and staged data
must stay inside the isolated test locations described above.
