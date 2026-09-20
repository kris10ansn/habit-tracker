# Closer desk scene

Created with the built-in image generation tool from the earlier desk-scene preview.
The retained blank source is `remarkable-desk-close-source.png`.

## Prompt

Use case: precise-object-edit. Edit the provided desk scene with a single change: a tighter camera composition, enlarging the reMarkable tablet AND cognac folio together so their combined silhouette occupies about 78% of image width and 80% of image height, fully visible with some breathing room. Preserve the same light oak desk, warm morning light, white tablet design, three evenly spaced square buttons on right bezel, folio at a slight angle underneath, soft realistic shadows. Keep glimpses of the same coffee cup at upper right, sage notebook and pen at top, greenery along left, and white stylus beside tablet, pushed toward/cropped by outer image edges as needed. Tablet is the hero. Strict overhead front-facing screen with horizontal and vertical edges, exact landscape 4:3 display opening, no perspective skew. Keep screen completely blank pale gray for later insertion of actual screenshot. No text, no new objects, no logos. Landscape 1536x1024 composition.

## Real screenshot composition

Uniformly scale the actual 4:3 sleep capture to 780 × 585 at (322, 215).
Multiply blending retains the generated display lighting.

```sh
magick docs/assets/device-frames/remarkable-desk-close-source.png \
  \( docs/assets/screenshots/remarkable-suspend.png \
     -background white -alpha remove -resize 780x585 \) \
  -geometry +322+215 -compose Multiply -composite -alpha off -strip \
  docs/assets/screenshots/framed/remarkable-showcase.png
```
