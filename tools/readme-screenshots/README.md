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
Quick host. The suspend image still comes from the existing production suspend renderer; the tool
only rotates its framebuffer-oriented result for readable README presentation.

## Android captures

The build has been verified against the Android Studio `Pixel_9a` AVD on API 36. Start that existing
AVD yourself, accept its one-time adb authorization prompt, and note its serial with `adb devices`.
The commands do not create or wipe an AVD, automate the desktop, or accept a physical or network
target.

Build the isolated release variant, then install it on an explicitly selected emulator:

```sh
pnpm screenshots:android:fixture
pnpm screenshots:android:build
pnpm screenshots:android:install -- --serial emulator-5554
```

Building only produces the APK; it never starts or selects an emulator. Installation and capture
are separate, explicit operations.

It installs as `no.silli.habittracker.readme`, uses the `habittracker-readme` URL scheme, stores
data in `habits-readme-screenshots.db`, supplies local auth/pairing/session reads, and rejects every
backend network request. It can coexist with the ordinary development app.

Capture all routes, or one route, from the already-running emulator:

```sh
pnpm screenshots:android -- --serial emulator-5554
pnpm screenshots:android -- --serial emulator-5554 --scenario devices
```

The install and capture runners verify both the `emulator-*` serial and Android's QEMU property
before changing anything.
It normalizes animation scale, portrait rotation, and font scale for the capture and restores the
previous values afterward. It never starts an emulator, runs a cloud build, or contacts another
device.

Once the Android screenshot build is installed, refresh both clients with:

```sh
pnpm screenshots -- --serial emulator-5554
```

Use `--out-dir <path>` to review captures elsewhere and `--keep-temp` to retain a failed run's
staging directory. The platform commands also accept `--scenario <name>`.

## Changing the fixture or scenarios

1. Edit `fixture.json` in backend vocabulary and add any scenario metadata to `scenarios.mjs`.
2. Run `pnpm screenshots:android:fixture` to refresh the generated mobile copy.
3. Add a renderer route/view mapping only in the relevant platform runner.
4. Run `pnpm screenshots:fixtures:test`, the platform checks, and the captures.

Fixture validation rejects duplicate identities and positions, unknown polarity/outcome spellings,
future entries, ambiguous pairing codes, and inconsistent session state. Generated and staged data
must stay inside the screenshot-only locations described above.
