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

## Mobile test target

Mobile's existing application source is unchanged. With `APP_TEST_MODE=1`, Metro replaces only the
root layout's `AppProviders` import with a test adapter. Before that adapter loads the production
provider, it freezes implicit `Date` construction and `Date.now()` and replaces the global fetch
implementation. It then wraps the real provider, seeds SQLite and SecureStore after migrations,
answers device and pairing reads locally, and rejects unexpected requests before they reach a
network. Expo Router remains the package entry point in both modes.

The test Expo config changes the project name and slug, fixes presentation to light mode, and
removes the production EAS project ID. The normal scheme and native identifiers are untouched.
Expo Go therefore gives the test project its own storage scope without introducing a
screenshot-specific APK target.

### Automated Expo Go captures

Install these user-run prerequisites once:

- Android SDK command-line tools, with a named AVD configured;
- an SDK 56-compatible Expo Go client installed in that AVD;
- Maestro CLI and its Java 17-or-newer runtime.

Then regenerate all six mobile images with:

```sh
pnpm mobile:test:screenshots -- --avd Pixel_9a
```

If exactly one AVD is configured, `--avd` can be omitted. To reuse an emulator that is already
running, pass its explicit local serial instead:

```sh
pnpm mobile:test:screenshots -- --serial emulator-5554
```

The command refreshes the generated fixture, starts test-mode Metro, starts the selected AVD
headlessly when necessary, checks that Expo Go is installed, and connects the emulator to Metro
with an adb reverse. One parameterized Maestro flow opens each Expo Router URL, waits for
fixture-backed UI, enters the fictional pairing code, and captures Today, Month, Habits, Sync,
Devices, and Link device.

Maestro writes to a temporary artifact directory. The wrapper verifies that every expected PNG
exists and is portrait before replacing anything under `docs/assets/screenshots/`. A failed run
keeps its logs and partial artifacts and prints their path.

The wrapper cleans up only resources it created:

- it always stops the Metro process it started;
- it removes only the adb reverse it added;
- it stops a newly started AVD unless `--keep-emulator` was passed;
- it never stops an emulator supplied with `--serial` or one that was already running;
- it rejects physical, network, offline, ambiguous, and non-QEMU device targets.

The script deliberately starts the chosen AVD through the Android emulator CLI instead of
`maestro start-device`. A named AVD retains the SDK-compatible Expo Go installation and fixes the
device profile used for README images; a generic Maestro-managed device may not provide either.

This is intentionally a resource-heavy, user-invoked command. Agents may maintain it and run its
lightweight tests, but do not execute Expo, Maestro, Java, or emulator steps unless the user
explicitly requests that operation.

### Manual Expo Go review

For visual debugging without the automation wrapper, run:

```sh
pnpm mobile:test:fixture
pnpm mobile:test:go
```

Open the displayed project yourself in the compatible Expo Go client, navigate normally, and use
Android Studio's screenshot control. Enter `H7K9Q2` on Link device. Stop Metro when finished.

## Changing the fixture or scenarios

1. Edit `fixture.json` in backend vocabulary and add any scenario metadata to `scenarios.mjs`.
2. Run `pnpm mobile:test:fixture` to refresh the generated mobile test data.
3. Add reMarkable presentation state or a mobile output name to the scenario registry.
4. Run `pnpm screenshots:fixtures:test`, the platform checks, and review new captures manually.

Fixture validation rejects duplicate identities and positions, unknown polarity/outcome spellings,
future entries, ambiguous pairing codes, and inconsistent session state. Generated and staged data
must stay inside the isolated test locations described above. The mobile automation always captures
the complete set so the README cannot silently mix fixture generations.
