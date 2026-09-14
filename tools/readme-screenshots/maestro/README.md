# Automated Expo Go screenshots

From the repository root, with an Android emulator already running:

```sh
npm run mobile:test:screenshots
```

The command captures Today, Habits, Month, Sync, Linked devices, and Link a device using the
fictional test fixture. No native app build or manual navigation is needed. It starts its own
Metro server, reloads the isolated Expo Go test project, waits for fixture data and icon fonts,
then navigates native routes and verifies their visible content twice before capturing each screen.
Existing Metro servers can stay running.

The default uses ADB and Android UIAutomator. Maestro repeatedly lost its driver connection on
this emulator, so it is retained as an experimental comparison:

```sh
npm run mobile:test:screenshots -- --driver maestro
```

That option runs `capture.yaml` with the same test app, logging, and timeout management.
See [the experiment report](../../../docs/maestro-screenshot-report.md) for measured results.

Prerequisites: workspace dependencies installed, Node.js 22+, `adb` on PATH,
and Expo Go compatible with this project's SDK installed on the emulator. The optional Maestro
driver also requires Java 17+ and `maestro` on PATH. Maestro 2.7.0 and 2.6.1 were tested. See the [official Maestro installation guide](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli).
An existing installation is sufficient; no AUR package is required by this script.

The command selects the sole online local emulator. With multiple emulators, select one explicitly:

```sh
npm run mobile:test:screenshots -- --serial emulator-5554
```

For a shorter Today-only capture, or a different unused Metro port:

```sh
npm run mobile:test:screenshots -- --scenario today
npm run mobile:test:screenshots -- --port 8083
```

## Results and logs

The command prints its output directory, `.screenshots/<timestamp>/`, containing:

- `screenshots/android-*.png`: successful portrait screenshots.
- `report.json`: pass/fail, stage timings, device, and diagnostic information.
- `logs/metro.log`: bundle output and JavaScript console messages.
- `logs/android.log`: React Native, Android runtime, Expo, and ADB warnings/errors.
- `logs/launch.log`: Android's response to opening the project.
- `native/*.xml`: UI state used to verify each screen.
- `native/events.log`: interrupted UI reads, when any occurred; the report counts them.
- `logs/maestro-*.log` and `maestro/`: optional Maestro attempt diagnostics and artifacts.
- `failure.png`: a best-effort diagnostic capture when a run fails.

Outputs are gitignored. The command does not replace the committed README images or frame them.
Only use images from a run whose report says `passed`; partial artifacts from failed runs remain
for diagnosis. The Android status bar clock is real time, so these are presentation captures,
not pixel-identical visual regression baselines.

## What keeps the run bounded

The command prints progress every 15 seconds. Metro startup and fixture readiness each have a
60-second limit; the capture phase has a 180-second limit; the entire run has a five-minute
watchdog. Individual ADB operations are limited to ten seconds. On failure or Ctrl+C it terminates
its own process groups, forcibly if needed, and saves a report. It leaves the emulator and
preexisting development servers running. Each screen has a 30-second readiness budget; interrupted
native UI reads are retried inside that budget. An operation rejected with `device offline` waits
for the emulator and retries at most twice; the report counts these recoveries. Maestro allows at most three driver attempts within
its capture budget and preserves all attempts. Invalid content is never accepted as a screenshot.

The emulator reaches Metro at `10.0.2.2` using Android Emulator's host alias. No `adb reverse` rule
is needed. This command is for a local Android Emulator on Linux, not a physical phone, remote
emulator, or iOS simulator. Port 8082 is the default; an occupied port fails with a useful message.
Run one capture at a time and avoid changing the app or using the emulator during a capture.

## Expo UI and warnings

`APP_SCREENSHOT_MODE=1` is set only on the command's isolated test Metro server. It hides
nonfatal React Native LogBox overlays while preserving console logging. Fatal runtime errors
remain visible and prevent a successful flow. Ordinary development and production modes are
unaffected. Known Expo Go developer onboarding/menu screens are dismissed automatically (by `dismiss-expo.yaml`
when using Maestro).
If Expo Go's cold launcher returns to Android Home without opening the project, the runner detects
that and resends the URL once. Other unexpected system dialogs fail the flow rather than being
included deliberately in successful screenshots.

## Editing the flows

The default driver's route and readiness definitions live in `../lib/native-capture.mjs`.

`today.yaml` checks the fixture's summary and reading streak, so simply seeing the screen title
is not sufficient. `capture.yaml` navigates the other routes and checks their loaded content.
Selectors should follow actual screen copy or stable accessibility IDs. Keep assertions for
asynchronous data instead of replacing them with fixed sleeps.

The YAML expects `EXPO_URL` to be supplied by the caller. Maestro 2.7.0 gives a YAML header's `env`
value precedence over `-e`, so do not add a hardcoded URL default there. For manual experimentation
against an already running screenshot-mode Metro server:

```sh
maestro --device emulator-5554 test \
  -e EXPO_URL=exp://10.0.2.2:8082 \
  --test-output-dir=/tmp/habit-screenshots \
  --debug-output=/tmp/habit-screenshots \
  tools/readme-screenshots/maestro/capture.yaml
```

This direct Maestro command has no outer timeout or Metro lifecycle management; use the npm
command for unattended captures.
