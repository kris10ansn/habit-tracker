const WIDTH = 1872;
const HEIGHT = 1404;
const PIXEL_OFFSET = 54 + 256 * 4;
const FILE_SIZE = PIXEL_OFFSET + WIDTH * HEIGHT;

function imageTargets(directory) {
    return [
        {
            path: "/usr/share/remarkable/splash/splash.bmp",
            backupName: "system-splash",
        },
        { path: "/var/lib/uboot/splash.bmp", backupName: "boot-splash" },
    ].map((target) => ({
        path: target.path,
        backup: `${directory}/device-${target.backupName}-original.bmp`,
        preview: `${directory}/developer-boot-splash.bmp`,
        state: "starting",
        format: "boot-bmp",
        optional: true,
    }));
}

// reMarkable 1 U-Boot copies 8-bit BMP indices directly to its grayscale framebuffer.
function validationError(buffer) {
    if (!buffer || buffer.byteLength !== FILE_SIZE)
        return "Expected a complete reMarkable 1 boot BMP";

    const header = new DataView(buffer);
    if (
        header.getUint16(0, true) !== 0x4d42 ||
        header.getUint32(2, true) !== FILE_SIZE ||
        header.getUint32(10, true) !== PIXEL_OFFSET ||
        header.getUint32(14, true) !== 40 ||
        header.getInt32(18, true) !== WIDTH ||
        header.getInt32(22, true) !== HEIGHT ||
        header.getUint16(26, true) !== 1 ||
        header.getUint16(28, true) !== 8 ||
        header.getUint32(30, true) !== 0
    )
        return "Expected an uncompressed 1872×1404, 8-bit reMarkable 1 boot BMP";

    return "";
}

function encodeLandscape(pixels, width, height) {
    if (
        width !== WIDTH ||
        height !== HEIGHT ||
        pixels.length !== WIDTH * HEIGHT * 4
    )
        throw new Error("Boot splash requires a 1872×1404 RGBA image");

    const buffer = new ArrayBuffer(FILE_SIZE);
    const header = new DataView(buffer);
    header.setUint16(0, 0x4d42, true);
    header.setUint32(2, FILE_SIZE, true);
    header.setUint32(10, PIXEL_OFFSET, true);
    header.setUint32(14, 40, true);
    header.setInt32(18, WIDTH, true);
    header.setInt32(22, HEIGHT, true);
    header.setUint16(26, 1, true);
    header.setUint16(28, 8, true);
    header.setUint32(34, WIDTH * HEIGHT, true);
    header.setUint32(46, 256, true);
    const bytes = new Uint8Array(buffer);
    for (let shade = 0; shade < 256; shade++) {
        const offset = 54 + shade * 4;
        bytes[offset] = shade;
        bytes[offset + 1] = shade;
        bytes[offset + 2] = shade;
    }
    for (let index = 0; index < WIDTH * HEIGHT; index++) {
        const x = index % WIDTH;
        const y = HEIGHT - 1 - Math.floor(index / WIDTH);
        const source = (y * WIDTH + x) * 4;
        const gray =
            (pixels[source] * 77 +
                pixels[source + 1] * 150 +
                pixels[source + 2] * 29 +
                128) >>
            8;
        const alpha = pixels[source + 3];
        bytes[PIXEL_OFFSET + index] = Math.round(
            (gray * alpha) / 255 + 255 - alpha,
        );
    }
    return buffer;
}
