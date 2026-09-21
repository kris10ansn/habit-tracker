# reMarkable 1 early boot splash

Researched 2026-09-21 against reMarkable's published U-Boot source. The source revisions below
are from 2020; they establish the published implementation, not the exact bootloader installed
on every firmware version.

## Two startup images

The early image is separate from the app's `/usr/share/remarkable/starting.png`. The published
reMarkable 1 (`zero-gravitas`) bootloader reads `splash.bmp` from MMC device 1, partition 1. It
selects `lowbattery.bmp` instead when battery charge is below its boot threshold. The source
selects the filename itself, so this is not another PNG state in the userspace image directory.
[Board selection](https://github.com/reMarkable/uboot/blob/97b35fdddf0077abd2e0f0409b94ef20adbe8565/board/reMarkable/zero-gravitas/zero-gravitas.c#L934-L951),
[filesystem loading](https://github.com/reMarkable/uboot/blob/97b35fdddf0077abd2e0f0409b94ef20adbe8565/common/splash_source.c#L166-L203).

The user's read-only device output confirmed `reMarkable 1.0`, a 2,629,366-byte
`/var/lib/uboot/splash.bmp`, and `/dev/mmcblk1p1` mounted read-write as VFAT at `/var/lib/uboot`.
Thus the bootloader's partition-root filename maps to `/var/lib/uboot/splash.bmp` on this device.
No `splash.*` file was present directly under `/usr/share/remarkable` in that output. The user
subsequently found `/usr/share/remarkable/splash/splash.bmp`; the initial glob did not inspect
that nested directory. These are device observations supplied by the user, not guarantees
about other firmware installations. The published bootloader consumes the partition-root
copy; the nested copy's runtime purpose needs separate evidence. The user subsequently copied
both files and reported identical SHA-256 hashes (recorded below), confirming matching bytes
on this tablet. The developer action replaces both existing copies and preserves separate backups.

The reported sequence—stock startup image for most of boot, then our starting image—is
consistent with U-Boot displaying its separate BMP before the userspace PNG appears. The exact
wording of the stock image is not embedded in the published loader source.

## BMP requirements

The board sets the display to **1872 columns × 1404 rows, 8 bits per pixel** (`vl_bpix = 3`, with
`NBITS(n) = 1 << n`). The BMP reader rejects a 24-bit BMP on this 8-bit display. A normal RGB
image saved with a `.bmp` extension is therefore insufficient.
[Panel configuration](https://github.com/reMarkable/uboot/blob/97b35fdddf0077abd2e0f0409b94ef20adbe8565/board/reMarkable/zero-gravitas/zero-gravitas.c#L955-L966),
[bit-depth definition](https://github.com/reMarkable/uboot/blob/97b35fdddf0077abd2e0f0409b94ef20adbe8565/include/lcd.h#L150-L176),
[BMP validation](https://github.com/reMarkable/uboot/blob/97b35fdddf0077abd2e0f0409b94ef20adbe8565/common/lcd.c#L573-L628).

A conservative full-screen encoding is:

- Windows BMP with a 14-byte file header and 40-byte information header.
- Width 1872, **positive height 1404**, one plane, 8 bits per pixel.
- Compression 0 (`BI_RGB`), pixel offset 1078, 256 ascending grayscale palette entries.
- Each index is the grayscale intensity itself; pixel rows are stored bottom-up.
- Exactly 2,628,288 pixel bytes and 2,629,366 total bytes; the 1872-byte row width needs no padding.

These choices follow the reader's fixed header/palette layout and raw byte-copy path. In
particular, it copies 8-bit pixel indices directly to framebuffer bytes rather than converting
each index through the BMP palette. Arbitrary indexed-color palettes therefore cannot encode
the intended grayscale reliably. The decoder starts at the last framebuffer row and walks
upward, so a negative/top-down height is unsuitable. RLE is not a usable encoding on this 8-bit
path: its optional RLE8 decoder explicitly requires a 16-bit framebuffer.
[BMP layout](https://github.com/reMarkable/uboot/blob/97b35fdddf0077abd2e0f0409b94ef20adbe8565/include/bmp_layout.h#L14-L65),
[pixel and compression handling](https://github.com/reMarkable/uboot/blob/97b35fdddf0077abd2e0f0409b94ef20adbe8565/common/lcd.c#L541-L693).

The bootloader does **not** rotate these bitmap pixels. The user's original boot BMP was
copied to `/tmp/remarkable-original-splash.bmp` and decoded to
`/tmp/remarkable-original-splash.png` for local inspection. The decoded image shows the logo
and "Paper tablet is starting" rotated **90° clockwise from portrait**, reading downward
near the image's right edge. Therefore rotate the app's 1404 × 1872 portrait pixel output
90° clockwise to obtain the corresponding 1872 × 1404 boot image. Keep this image rotation
separate from BMP's bottom-up row storage. This direction is established by the original
device asset, not inferred solely from the published loader.
[Pixel addressing](https://github.com/reMarkable/uboot/blob/97b35fdddf0077abd2e0f0409b94ef20adbe8565/common/lcd.c#L629-L693).

Independent inspection of that original confirmed the full encoding above: `BM` signature,
40-byte DIB header, 1872 × positive 1404, one plane, 8 bpp, compression 0, pixel offset 1078,
256 palette entries `(i,i,i,0)`, and total size 2,629,366 bytes. Its SHA-256 is
`e3116678fbaf102f3905021bff19e46114c674b88a5c54cb67b3e39c5b5a0e55`.
The temporary paths identify the inspected local evidence; they are not repository artifacts.

## Nested userspace copy: evidence still needed

The archived 2020 reMarkable update-engine source executes `/postinst` from the newly mounted
update filesystem, but its supplied `remarkable-postinst` contains no splash-copy code.
The original `reMarkable/update_engine` repository is no longer publicly accessible; the
linked archive is a fork. This source cannot establish what the user's current firmware
does with `/usr/share/remarkable/splash/splash.bmp`, nor justify assuming it is read on every
boot. Inspect the device's installation scripts or service units before claiming such behavior.
[Archived postinstall runner](https://github.com/Eeems/update_engine/blob/4f581c3efd4a18c3b17aba29b7c4153adb76fd9c/src/update_engine/postinstall_runner_action.cc#L18-L70),
[archived installation script](https://github.com/Eeems/update_engine/blob/4f581c3efd4a18c3b17aba29b7c4153adb76fd9c/remarkable-postinst).

## Failure behavior and implementation limits

The loader reports errors for missing/unreadable files and BMP bit-depth mismatches; the LCD
initialization path falls through to its normal logo path when splash rendering fails. This
does **not** establish that every malformed BMP is harmless: the decoder trusts the header's
pixel offset and dimensions without validating them against file length. Reject unexpected
headers and truncated data before writing, and preserve a verified original backup. The
bootloader's filesystem loader checks that the loaded file does not overlap its own stack, but
that is not comprehensive BMP validation.
[Load-size check](https://github.com/reMarkable/uboot/blob/97b35fdddf0077abd2e0f0409b94ef20adbe8565/common/splash_source.c#L187-L203),
[render failure path](https://github.com/reMarkable/uboot/blob/97b35fdddf0077abd2e0f0409b94ef20adbe8565/common/lcd.c#L225-L237),
[decoder](https://github.com/reMarkable/uboot/blob/97b35fdddf0077abd2e0f0409b94ef20adbe8565/common/lcd.c#L573-L693).

`lowbattery.bmp` is another early-boot asset, distinct from userspace `batteryempty.png`; its
existence and format on this particular device have not been inspected. Do not silently add it
to the current starting-screen change.

## reMarkable 2 is different

The published reMarkable 2 (`zero-sugar`) loader reads **`splash.dat`**, not BMP. It interprets
four 32-bit fields (`x0`, `y0`, width, height), followed by width × height bytes; it checks total
size and bounds against 1872 × 1404, then passes the pixels to its splash routine. A BMP writer
must therefore be restricted to the verified reMarkable 1 case.
[reMarkable 2 loader](https://github.com/reMarkable/uboot/blob/47c91918aa7724c16b6eaf87cf5dfbf4548eafc1/board/reMarkable/zero-sugar/epd_display_init.c#L276-L363).
