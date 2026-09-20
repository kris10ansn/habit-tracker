# Device-frame source

`device-family-source.png` is retained AI-generated artwork used by the README linking concept. It
combines the selected minimal white Paper Pro-inspired reMarkable frame with the minimal graphite phone
frames. The display interiors are intentionally blank: real application pixels are added by the
deterministic compositor.

Keep its dimensions and device positions unchanged. `tools/readme-screenshots/lib/device-frames.mjs`
contains screen-window coordinates calibrated to this file: every reMarkable window is exactly 4:3
and every Android window is exactly 45:101, matching the raw captures without cropping, stretching,
or gutters. The compositor replaces only those windows, so device texture, lighting, and shadows
remain stable in every generated image.

The white tablet surround was selected from the [frame variations](variations/README.md). It is
decorative presentation artwork, not an indication that the app supports Paper Pro hardware.
Only the tablet region was replaced; the phone artwork and calibrated display windows were retained.

## Folio showcase source

`remarkable-folio-front-source.png` is the selected frame for the README's opening sleep-screen
showcase: a larger front-facing white tablet over an angled tan leather folio. Its display is blank.
The 1448x1086 artwork has an exact 944x708 (4:3) screen window at x=228, y=176. Keep these dimensions
stable unless recalibrating `remarkableShowcase` in `tools/readme-screenshots/lib/device-frames.mjs`.

`composeRemarkableShowcase` uniformly scales the real capture into that window without stretching
or cropping. Multiplication retains the blank screen's shading; all displayed text and marks come
from the application screenshot. The frame was prepared with the built-in imagegen tool and its
height calibrated to the native display ratio before screenshot insertion.

`pnpm screenshots:showcase` regenerates the showcase from the current raw sleep-screen capture;
the normal capture and frame workflows also refresh it when processing the sleep screen.
