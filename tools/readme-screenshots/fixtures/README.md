# reMarkable adaptive layout fixtures

These extend the shared fictional screenshot fixture with eleven or twenty habits, including one
private habit revealed by Settings. They exercise the compact layout and vertical page controls.
The default fixture remains the roomy six-habit example used by the other native page screenshots.

From the repository root:

```sh
node tools/readme-screenshots/capture-remarkable.mjs
node tools/readme-screenshots/capture-remarkable.mjs --scenario grid --fixture tools/readme-screenshots/fixtures/remarkable-eleven.json --out-dir /tmp/remarkable-eleven
node tools/readme-screenshots/capture-remarkable.mjs --scenario grid --fixture tools/readme-screenshots/fixtures/remarkable-twenty.json --out-dir /tmp/remarkable-twenty
```

The extra captures are named `remarkable-grid.png` in their output directories. The checked-in
copies are `docs/assets/screenshots/remarkable-grid-eleven.png` and
`docs/assets/screenshots/remarkable-grid-overflow.png`, with corresponding `framed/` copies.
All raw images are native Qt 5.15 renders at 1872 × 1404; they do not simulate e-ink refresh or the
tablet's on-screen keyboard. No device connection is used.
