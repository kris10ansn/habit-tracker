# Device-frame source

`device-family-source.png` is retained AI-generated artwork used by the README linking concept. It
combines the selected original-inspired reMarkable frame with the selected minimal graphite phone
frames. The display interiors are intentionally blank: real application pixels are added by the
deterministic compositor.

Keep its dimensions and device positions unchanged. `tools/readme-screenshots/lib/device-frames.mjs`
contains screen-window coordinates calibrated to this file: every reMarkable window is exactly 4:3
and every Android window is exactly 45:101, matching the raw captures without cropping, stretching,
or gutters. The compositor replaces only those windows, so device texture, lighting, and shadows
remain stable in every generated image.
