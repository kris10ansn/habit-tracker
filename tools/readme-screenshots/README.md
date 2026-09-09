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

## Mobile test target and manual captures

Mobile's existing application source is unchanged. The isolated build selects a test-only entry
with `ENTRY_FILE`; that entry freezes implicit `Date` construction and `Date.now()`, replaces the
global fetch implementation, then starts Expo Router normally. For this build only, Metro replaces
the root layout's `AppProviders` import with a test adapter. The adapter wraps the real production
provider, seeds SQLite and SecureStore after migrations, answers device and pairing reads locally,
and rejects unexpected requests before they reach a network.

Agents leave native builds, emulator launches, installation, and other resource-heavy steps to the
user unless the user explicitly requests that specific operation.

Build the test APK without starting an emulator:

```sh
pnpm mobile:test:fixture
pnpm mobile:test:build
```

The build installs as `no.silli.habittracker.test` and uses the `habittracker-test` URL scheme. Its
ordinary `habits.db` and SecureStore values live in that test application's native sandbox, so it
can coexist with the normal app without sharing data.

Start and authorize an existing emulator yourself, then install on its explicit serial:

```sh
pnpm mobile:test:install -- --serial emulator-5554
```

Navigate the app manually. Android Studio's screenshot button is the simplest capture mechanism.
The optional helper below only saves the currently visible portrait screen under the selected
scenario name; it does not launch an emulator, navigate, click, alter settings, or automate the
desktop.

```sh
pnpm mobile:test:capture -- --serial emulator-5554 --name today
pnpm mobile:test:capture -- --serial emulator-5554 --name devices
```

Both helpers require an `emulator-*` serial and verify Android's QEMU property. They reject
physical, network, offline, and ambiguous targets.

## Changing the fixture or scenarios

1. Edit `fixture.json` in backend vocabulary and add any scenario metadata to `scenarios.mjs`.
2. Run `pnpm mobile:test:fixture` to refresh the generated mobile test data.
3. Add reMarkable presentation state or a mobile output name to the scenario registry.
4. Run `pnpm screenshots:fixtures:test`, the platform checks, and review new captures manually.

Fixture validation rejects duplicate identities and positions, unknown polarity/outcome spellings,
future entries, ambiguous pairing codes, and inconsistent session state. Generated and staged data
must stay inside the isolated test locations described above.
