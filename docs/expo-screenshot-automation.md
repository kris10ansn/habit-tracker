# Expo screenshot automation options

Research checked against official documentation on 2026-09-14. This is a proposed approach, not a
validated capture implementation. No emulator, build, installation, or device capture was run.

## Recommendation

Keep the existing isolated Expo Go test project, a visible Android emulator, and Metro running
between captures. Automate only opening the requested screen, checking its rendered state, and
saving the image. Avoid making device boot, installation, bundler startup, and capture one lifecycle.
This is an engineering recommendation to reduce failure points, not a claim that a visible emulator
is inherently reliable or that the previous failures have been diagnosed.

Maestro is a suitable UI driver, but selecting Maestro alone is not the missing solution: repository
commit `8bd205d` already introduced an Expo Go Maestro flow and a large capture orchestrator. The
current [screenshot workflow](../tools/readme-screenshots/README.md) deliberately leaves navigation
and capture timing to the user. A new attempt should prove a small repeatable loop before expanding.

## Verified capabilities

| Option | Build cost | What it provides |
| --- | --- | --- |
| Expo Go + local Maestro | No application build while native dependencies remain compatible | Native UI navigation and assertions, then PNG capture |
| Installed development build + local Maestro | Initial build; rebuild when native code/configuration changes | Same Metro-driven UI iteration, with the app's own native identity |
| Expo Go + manual navigation + adb capture | No application build | Smallest capture mechanism; a person chooses the screen and judges readiness |
| USB-connected Android + either runtime | Same runtime build rules | Avoids emulator boot/rendering dependencies; requires device setup and a stable screen configuration |

Maestro explicitly supports Expo Go and React Native `testID` selectors. Its Expo Go guidance uses
`openLink` with the development URL, because `launchApp` with the project's standalone package ID
cannot launch an experience inside the Expo container. No instrumentation library needs adding to
the application. [Maestro React Native documentation](https://docs.maestro.dev/get-started/supported-platform/react-native)

Expo Go uses links such as `exp://127.0.0.1:8081/--/month`; `/--/` separates the application route
from the development server address. The address and port must match the running server and be
reachable from the device. The application's custom native scheme does not replace this Expo Go
URL. [Expo deep-link documentation](https://docs.expo.dev/linking/into-your-app/)

Expo Go has a fixed set of native libraries and must match the project's SDK version. The repository
currently specifies SDK 57. Screens rendered from compatible JavaScript can be captured in Expo Go;
app icons, native splash behavior, and other native configuration are not faithfully tested there.
[Expo development-build FAQ](https://docs.expo.dev/develop/development-builds/faq/)

A development build also avoids rebuilding for TypeScript/JavaScript-only changes: once installed,
it loads changes from Metro. A new native library, native configuration change, or SDK upgrade may
require rebuilding. Thus an installed development build remains a fast fallback if Expo Go itself
becomes the obstacle. [Expo development-build introduction](https://docs.expo.dev/develop/development-builds/introduction/)

Maestro can attach to an already-running Android emulator or a physical device over adb; it assumes
the target app is installed. Use an explicit device identifier. This capability does not change the
repository's existing emulator-only helper restrictions or authorize running physical-device work.
[Android support](https://docs.maestro.dev/get-started/supported-platform/android),
[device selection](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/specify-and-start-devices)

For a USB-connected Android device, `adb -s <serial> reverse tcp:8081 tcp:8081` is the documented
development-server connection mechanism. Using a fixed port and adb transport is a reasonable way
to remove LAN discovery from the proposed loop, subject to verifying Expo Go connects correctly on
the actual target. [React Native device connectivity](https://reactnative.dev/docs/0.80/running-on-device)

## Make readiness observable

The existing test adapter already provides frozen time, seeded local data, mocked network responses,
and a fixed camera image. Preserve those controls and the test project's storage isolation.
[Local test workflow](../tools/readme-screenshots/README.md)

For every capture, require an identifiable screen and its expected fixture content. Prefer stable
IDs over coordinate taps. Wait for loading indicators to disappear and dismiss any expected Expo
onboarding once during setup. Capture failures should report which stage failed: device connection,
project open, fixture load, screen navigation, rendered-state assertion, or image write.

Maestro assertions retry automatically; `extendedWaitUntil` supports a longer bounded wait.
`waitForAnimationToEnd` is supplementary: its timeout succeeds and continues, so it does not prove
that a requested screen or its data is ready. A JavaScript log emitted before React renders is also
insufficient evidence of capture readiness. [Wait strategies](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/wait-commands),
[animation-wait semantics](https://docs.maestro.dev/reference/commands-available/waitforanimationtoend)

`takeScreenshot` writes a PNG into the flow's artifact bundle; configure a temporary output directory
and promote images into `docs/assets/screenshots/` only after the requested set passes checks.
For a minimal manual-navigation workflow, Android directly supports
`adb -s <serial> exec-out screencap -p > screen.png`. Neither operation validates which screen is
visible; that belongs to the preceding assertions or human review.
[Maestro screenshots](https://docs.maestro.dev/reference/commands-available/takescreenshot),
[Android screenshot command](https://developer.android.com/tools/adb#screencap)

## Validation before committing to another automation system

Start with Today only and run the same warm-device, warm-Metro loop 10–20 times. Keep each run's
logs and image, check that it contains the expected fixture content, and classify every failure.
Then add Month and one more complex pairing state. This is a proposed acceptance exercise, not a
statistical reliability guarantee. Include a reload after a UI edit before accepting the approach.

If that succeeds, expand the flow and reuse the existing frame compositor. If failures arise before
screen navigation, changing UI drivers is unlikely to solve them: compare Expo Go with one reusable
development build, or the emulator with a dedicated Android device, according to the observed
failure stage. There is not enough runtime evidence here to identify the cause of the previous
headless-emulator or capture failures.
