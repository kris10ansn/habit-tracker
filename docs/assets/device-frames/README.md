# Device-frame source

`device-family-source.png` is the original AI-generated device artwork used by the README linking
concept. It is the immutable source for the deterministic screenshot compositor, rather than an
image shown directly in the README.

Keep its dimensions and device positions unchanged: `tools/readme-screenshots/lib/device-frames.mjs`
contains screen-window coordinates calibrated to this file. The compositor replaces only those
windows, so the source's device texture, lighting, and shadows are preserved in every generated
image.
