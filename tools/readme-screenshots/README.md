# README screenshot tools

These tools regenerate the real application images committed under
`docs/assets/screenshots/`. Both clients consume the fictional, backend-shaped story in
`fixture.json`, dated 2026-09-09. No live backend, account, reMarkable, or user database is used.

## Device frames

Raw captures remain under `docs/assets/screenshots/` so they can be inspected without presentation
effects. Their README-ready copies live under `docs/assets/screenshots/framed/`.

The frame source is the existing AI-generated
`docs/assets/device-frames/device-family-source.png`. The compositor crops the unchanged tablet or
phone shell from that image, blanks its old screen pixels, fits a current capture into the
calibrated screen window without cropping, masks the phone's round corners, and restores its camera
cutout. Device texture, lighting, and shadow therefore remain stable across screenshot updates; AI
is not involved after the frame source has been committed.

Both capture helpers create the matching framed output automatically. Existing or manually copied
captures can be framed separately:

```sh
pnpm screenshots:frame
pnpm screenshots:frame -- --client remarkable --scenario settings
pnpm screenshots:frame -- --client android --scenario devices
```

The three-device linking scene is generated separately. It replaces every source screen currently
available and leaves the original concept pixels in any missing slot. The committed example uses
real captures in all three slots; the fallback only keeps partial regeneration possible if one is
temporarily unavailable:

```sh
pnpm screenshots:linking
```

To frame an arbitrary compatible PNG, provide its client and explicit paths:

```sh
pnpm screenshots:frame -- --client remarkable --input ./screen.png --output ./framed.png
```

The compositor rejects the wrong orientation and large aspect-ratio mismatches. Smaller differences
are centered against the frame's off-white screen color rather than stretching or cropping the app
UI. ImageMagick provides the only image-processing dependency.

## reMarkable captures

Install host Qt 5.15 development packages and ImageMagick, then run:

```sh
pnpm screenshots:remarkable
pnpm screenshots:remarkable -- --scenario pairing
```

The normal pages come from the live `apps/remarkable/src/Main.qml` scene through an offscreen Qt
Quick host. The suspend image still comes from the production suspend renderer; the tool only
rotates its framebuffer-oriented result for readable README presentation. Each raw capture and its
framed presentation copy are written together.

## Mobile test target and manual captures

Mobile's existing application source is unchanged. With `APP_TEST_MODE=1`, Metro replaces only the
root layout's `AppProviders` import with a test adapter. Before that adapter loads the production
provider, it freezes implicit `Date` construction and `Date.now()` and replaces the global fetch
implementation. It then wraps the real provider, seeds SQLite and SecureStore after migrations,
answers device and pairing reads locally, and rejects unexpected requests before they reach a
network. Expo Router remains the package entry point in both modes.

Agents leave native builds, emulator launches, installation, and other resource-heavy steps to the
user unless the user explicitly requests that specific operation.

### Expo Go (recommended)

Regenerate the fixture, then start the test project:

```sh
pnpm mobile:test:fixture
pnpm mobile:test:go
```

Open the displayed project in an SDK 56-compatible Expo Go installation yourself. The command does
not select or launch an emulator. Test mode uses the separate `habit-tracker-test` Expo project
identity and omits the production EAS project ID, so its Expo Go SQLite and SecureStore data do not
share the ordinary project's storage scope.

Navigate Today, Month, Habits, Sync, Link device, and Devices normally. Type the fixture pairing code
`H7K9Q2` when capturing Link device. Android Studio's screenshot button is the simplest capture
mechanism. Stop the Expo development server when finished.

### Optional standalone APK

Use this route when Expo Go is unsuitable or a standalone application capture is specifically
needed:

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

Navigate the app manually. The optional helper below is for the standalone APK only. It saves the
currently visible portrait screen under the selected scenario name; it does not launch an emulator,
navigate, click, alter settings, or automate the desktop.

```sh
pnpm mobile:test:capture -- --serial emulator-5554 --name today
pnpm mobile:test:capture -- --serial emulator-5554 --name devices
```

Both helpers require an `emulator-*` serial and verify Android's QEMU property. They reject
physical, network, offline, and ambiguous targets. A successful capture also writes its framed
presentation copy.

## Changing the fixture or scenarios

1. Edit `fixture.json` in backend vocabulary and add any scenario metadata to `scenarios.mjs`.
2. Run `pnpm mobile:test:fixture` to refresh the generated mobile test data.
3. Add reMarkable presentation state or a mobile output name to the scenario registry.
4. Run `pnpm screenshots:frame` and `pnpm screenshots:linking` after adding manual captures.
5. Run `pnpm screenshots:fixtures:test`, the platform checks, and review new captures manually.

Fixture validation rejects duplicate identities and positions, unknown polarity/outcome spellings,
future entries, ambiguous pairing codes, and inconsistent session state. Generated and staged data
must stay inside the isolated test locations described above.
