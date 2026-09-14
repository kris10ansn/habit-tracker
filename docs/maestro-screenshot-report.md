# Screenshot automation report — 14 September 2026

The usable workflow is now:

```sh
npm run mobile:test:screenshots
```

It uses the existing Android emulator and Expo Go, starts a separate Metro server, seeds the
fictional fixture, captures six native screens, and shuts down its own processes. No native
build, login, navigation, or screenshot button is required. The default driver is ADB with native
Android UIAutomator checks; Maestro remains an experimental option:

```sh
npm run mobile:test:screenshots -- --driver maestro
```

[Command options and prerequisites](../tools/readme-screenshots/maestro/README.md).

## What worked

The native workflow produced five successful six-screen runs and one later failure during validation.
The failure at 16:58 UTC exposed an offline route/screenshot command outside the UI-read retry loop.
The final implementation retries operations explicitly rejected as `device offline` at most twice,
within the same capture deadline. The final plain npm command passed and exited with code 0.
The table includes the failed run rather than treating all runs as a clean streak. Each run opens
a fresh test runtime; readiness requires two successive native UI reads containing the expected
fixture content. Interrupted UI reads are logged and retried within a 30-second per-screen budget.

| Run report (UTC timestamp)                                                       | Result | Duration | Retried UI reads | Retried offline commands |
| -------------------------------------------------------------------------------- | ------ | -------- | ---------------- | ------------------------ |
| [2026-09-14T16-52-20.493Z](../.screenshots/2026-09-14T16-52-20.493Z/report.json) | passed | 70 s     | 0                | 0                        |
| [2026-09-14T16-53-55.469Z](../.screenshots/2026-09-14T16-53-55.469Z/report.json) | passed | 71 s     | 4                | 0                        |
| [2026-09-14T16-55-06.388Z](../.screenshots/2026-09-14T16-55-06.388Z/report.json) | passed | 73 s     | 2                | 0                        |
| [2026-09-14T16-56-19.421Z](../.screenshots/2026-09-14T16-56-19.421Z/report.json) | passed | 72 s     | 4                | 0                        |
| [2026-09-14T16-58-38.619Z](../.screenshots/2026-09-14T16-58-38.619Z/report.json) | failed | 55 s     | 0                | 0                        |
| [2026-09-14T17-01-20.083Z](../.screenshots/2026-09-14T17-01-20.083Z/report.json) | passed | 68 s     | 0                | 0                        |

These are a small local sample on one already-running emulator, not a guarantee for every machine.
A separate baseline of twenty direct ADB screenshots also passed twenty out of twenty; that baseline
did not test navigation. The first native navigation prototype failed on an empty UI dump; the
final version handles interrupted reads and waits for subprocess output to finish draining.

The multi-run Python harness received SIGTERM after its third child had written its successful
report; its aggregate summary was not written. The individual reports and all six images from that
child are present. Separate single-command runs are used to verify normal process exit as well.

All six images in the first successful native run were visually inspected: Today, Habits, Month,
Sync, Linked devices, and Link a device. Icons and the pairing camera illustration rendered, and
no Expo developer menu or warning banner appeared. The Sync fixture intentionally shows
“Changes not synced”; it has local edits newer than its last sync.

[Today example](../.screenshots/2026-09-14T16-52-20.493Z/screenshots/android-today.png) ·
[Month example](../.screenshots/2026-09-14T16-52-20.493Z/screenshots/android-month.png) ·
[Pairing example](../.screenshots/2026-09-14T16-52-20.493Z/screenshots/android-pairing.png).

## What happened with Maestro

Across fifteen recorded development runs before the ADB alternative, two succeeded: a Today-only
capture in 39 seconds, and a three-screen capture in 53 seconds. The other runs included Expo
startup failures, incorrect initial selectors/configuration, and repeated ADB/driver failures.
These used changing configurations, so 2/15 is an experiment tally, not a controlled failure rate.
One additional run correctly stopped at preflight because port 8082 was occupied.

Maestro 2.7.0 repeatedly reported `DeviceServerDiedException`, gRPC `UNAVAILABLE`, or `device offline`.
Failures occurred during driver installation, UI inspection, and screenshots. The emulator's ADB
log also recorded transport disconnects. Reconnecting and limiting retries to three attempts did
not make the flow dependable. An isolated comparison with official Maestro 2.6.1 failed with the
same class of errors. The installed 2.7.0 package was not replaced; the temporary 2.6.1 download was removed after testing.

Reducing animation polling and collecting Android logs after capture instead of keeping a logcat
stream open did not eliminate the Maestro failures. The exact underlying transport defect remains
unresolved. The ADB approach avoids a long-lived Maestro driver session and can recover individual
UI reads without replaying the entire flow.

Official releases used for comparison:
[Maestro 2.7.0](https://github.com/mobile-dev-inc/Maestro/releases/tag/cli-2.7.0) and
[Maestro 2.6.1](https://github.com/mobile-dev-inc/Maestro/releases/tag/cli-2.6.1).

## Fixes that apply to both drivers

- Start an isolated test Metro server on an unused port (8082 by default), with an IPv4 binding.
- Use `10.0.2.2` for bundle delivery. ADB disconnects had removed `adb reverse` rules, leaving Expo
  unable to load; the emulator host alias avoids that dependency.
- If Expo Go's cold launcher returns to Android Home, resend the project URL once. This recovery
  ran automatically in the successful native tests.
- Wait for seeded SQLite data and icon fonts, then assert actual rendered fixture content.
- Hide nonfatal LogBox notices only when `APP_SCREENSHOT_MODE=1` in the isolated test project.
  Console logging remains enabled; fatal runtime errors are not suppressed. Known developer
  onboarding/menu UI is dismissed automatically.
- Drain subprocess stdout before accepting results; keep stderr separate from binary PNG output.
- Bound Metro startup and test readiness to 60 seconds each, capture to 180 seconds, ADB calls to
  ten seconds, and the overall run to five minutes. Print progress every fifteen seconds and
  terminate owned process groups, with forced cleanup when needed.

Maestro-specific fixes also removed the hardcoded YAML `EXPO_URL` (which took precedence over CLI
`-e` in 2.7.0) and made retry navigation explicit, since reopening the current root URL could leave
the previous tab selected. Its YAML is retained for further comparison, not claimed reliable.

## Logs, checks, and scope

Every run has a gitignored `.screenshots/<timestamp>/` directory with PNGs, stage timings,
pass/fail status, Metro output, launch diagnostics, and native UI XML. Native read failures are in
`native/events.log`; Maestro attempts have separate logs and artifact directories. Android's
filtered log buffer is collected at the end, so a very busy device can lose older native log lines;
Metro output is saved continuously. An unsuccessful run retains a best-effort failure screenshot.
Only a `passed` report identifies a complete successful capture set.

Validation: 29 screenshot-tool tests passed, including deadlines for commands and descendants that
ignore SIGTERM, complete stdout draining, binary output isolation, fixture isolation, and UI
readiness parsing, and recovery of an explicitly offline screenshot command. Mobile TypeScript checking and linting of the changed mobile files passed.
Formatting checks passed.

Test environment: Manjaro Linux, Pixel_9a emulator `emulator-5554`, Android 16
(`BE2A.250530.026.D1/13818094`), 1080×2424, Android SDK ADB 37.0.1, Expo Go, Node 26.8.1.
The command is intended for an already-running local Linux Android emulator with compatible Expo
Go and installed workspace dependencies. It does not launch an emulator, build an APK, control a
physical device, or replace committed README images. Existing emulator and development-server
processes are preserved. No backend or reMarkable changes were made for this task.

The app fixture date is fixed, but the Android status bar clock remains real time. These are
presentation screenshots, not pixel-identical visual regression baselines. English fixture copy
is part of the readiness checks; UI or fixture changes may require selector updates.
