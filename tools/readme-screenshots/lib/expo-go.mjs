import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

export const EXPO_GO_PACKAGE = "host.exp.exponent";

export function metroEnvironment(baseEnvironment) {
    const ipv4First = "--dns-result-order=ipv4first";
    const existingNodeOptions = baseEnvironment.NODE_OPTIONS?.trim();

    return {
        ...baseEnvironment,
        APP_TEST_MODE: "1",
        CI: "1",
        NODE_OPTIONS: existingNodeOptions?.includes(ipv4First)
            ? existingNodeOptions
            : [existingNodeOptions, ipv4First].filter(Boolean).join(" "),
        // `--localhost` can otherwise advertise `localhost` even when the host probe and adb
        // reverse both use IPv4. A literal address keeps all three ends of the route aligned.
        REACT_NATIVE_PACKAGER_HOSTNAME: "127.0.0.1",
    };
}

export function expoGoRouteUrl(projectUrl, route) {
    const url = new URL(projectUrl);
    if (url.protocol !== "exp:" && url.protocol !== "exps:") {
        throw new Error(`Expected an Expo Go URL, received ${projectUrl}`);
    }

    // The emulator reaches the host through an adb reverse on the same literal IPv4 loopback.
    url.hostname = "127.0.0.1";
    const projectPath = url.pathname.replace(/\/+$/g, "");
    const normalizedRoute = route.replace(/^\/+|\/+$/g, "");
    url.pathname = normalizedRoute
        ? `${projectPath}/--/${normalizedRoute}`
        : projectPath || "/";
    return url.toString();
}

export function chooseEmulatorPort(devices) {
    const occupiedPorts = new Set(
        devices
            .map(({ serial }) => /^emulator-(\d+)$/.exec(serial)?.[1])
            .filter(Boolean)
            .map(Number),
    );

    for (let port = 5554; port <= 5682; port += 2) {
        if (!occupiedPorts.has(port)) return port;
    }
    throw new Error("No Android emulator console port is available");
}

export function hasReverseRule(output, serial, port) {
    const expected = [`tcp:${port}`, `tcp:${port}`];
    return output.split(/\r?\n/).some((line) => {
        const fields = line.trim().split(/\s+/);
        if (fields.length === 2)
            return fields.every((field, index) => field === expected[index]);
        return (
            fields.length === 3 &&
            fields[0] === serial &&
            fields.slice(1).every((field, index) => field === expected[index])
        );
    });
}

function decodeXml(value) {
    return value.replace(
        /&(?:#(\d+)|#x([\da-f]+)|quot|apos|lt|gt|amp);/gi,
        (entity, decimal, hexadecimal) => {
            if (decimal) return String.fromCodePoint(Number(decimal));
            if (hexadecimal)
                return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
            return {
                "&quot;": '"',
                "&apos;": "'",
                "&lt;": "<",
                "&gt;": ">",
                "&amp;": "&",
            }[entity.toLowerCase()];
        },
    );
}

export function parseUiHierarchy(xml) {
    const nodes = [];
    for (const match of xml.matchAll(/<node\b([^>]*)\/?\s*>/g)) {
        const attributes = {};
        for (const attribute of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) {
            attributes[attribute[1]] = decodeXml(attribute[2]);
        }
        nodes.push(attributes);
    }
    return nodes;
}

export function visibleUiText(nodes) {
    return [
        ...new Set(
            nodes
                .flatMap((node) => [node.text, node["content-desc"]])
                .filter(Boolean),
        ),
    ];
}

export function missingUiText(nodes, expectedText) {
    const visibleText = visibleUiText(nodes).join("\n");
    return expectedText.filter((text) => !visibleText.includes(text));
}

export function editableCenter(nodes) {
    const input = nodes.find(
        (node) =>
            node.class === "android.widget.EditText" &&
            node.enabled !== "false" &&
            node.bounds,
    );
    if (!input) throw new Error("Pairing-code text input is not visible");

    const match = /^\[(\d+),(\d+)]\[(\d+),(\d+)]$/.exec(input.bounds);
    if (!match) throw new Error(`Invalid input bounds: ${input.bounds}`);
    const [, left, top, right, bottom] = match.map(Number);
    if (right <= left || bottom <= top) {
        throw new Error(
            `Pairing-code text input has empty bounds: ${input.bounds}`,
        );
    }
    return {
        x: Math.round((left + right) / 2),
        y: Math.round((top + bottom) / 2),
    };
}

export function foregroundSummary(windowDump) {
    return windowDump
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => /mCurrentFocus|mFocusedApp|imeInputTarget/.test(line))
        .join(" | ");
}

const pngSignature = Buffer.from("89504e470d0a1a0a", "hex");
const crcTable = Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1) >>> 0;
    }
    return crc;
});

function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function paeth(left, above, upperLeft) {
    const estimate = left + above - upperLeft;
    const leftDistance = Math.abs(estimate - left);
    const aboveDistance = Math.abs(estimate - above);
    const upperLeftDistance = Math.abs(estimate - upperLeft);
    if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance)
        return left;
    return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function decodePixels(compressed, width, height, channels) {
    const filtered = inflateSync(compressed);
    const stride = width * channels;
    const expectedLength = (stride + 1) * height;
    if (filtered.length !== expectedLength) {
        throw new Error(
            `PNG pixel data has ${filtered.length} bytes; expected ${expectedLength}`,
        );
    }

    const pixels = Buffer.alloc(stride * height);
    let sourceOffset = 0;
    for (let row = 0; row < height; row += 1) {
        const filter = filtered[sourceOffset];
        sourceOffset += 1;
        if (filter > 4)
            throw new Error(`PNG row uses unknown filter ${filter}`);

        const rowOffset = row * stride;
        for (let column = 0; column < stride; column += 1) {
            const encoded = filtered[sourceOffset + column];
            const left =
                column >= channels ? pixels[rowOffset + column - channels] : 0;
            const above = row > 0 ? pixels[rowOffset + column - stride] : 0;
            const upperLeft =
                row > 0 && column >= channels
                    ? pixels[rowOffset + column - stride - channels]
                    : 0;
            let predictor = 0;
            if (filter === 1) predictor = left;
            else if (filter === 2) predictor = above;
            else if (filter === 3) predictor = Math.floor((left + above) / 2);
            else if (filter === 4) predictor = paeth(left, above, upperLeft);
            pixels[rowOffset + column] = (encoded + predictor) & 0xff;
        }
        sourceOffset += stride;
    }
    return pixels;
}

export function validatePng(bytes, label = "screenshot") {
    if (!Buffer.isBuffer(bytes) || !bytes.subarray(0, 8).equals(pngSignature)) {
        throw new Error(`${label} is not a PNG`);
    }

    let offset = 8;
    let header;
    let ended = false;
    const imageData = [];
    while (offset < bytes.length) {
        if (offset + 12 > bytes.length) {
            throw new Error(`${label} has a truncated PNG chunk`);
        }
        const length = bytes.readUInt32BE(offset);
        const chunkEnd = offset + 12 + length;
        if (chunkEnd > bytes.length) {
            throw new Error(`${label} has a truncated PNG chunk body`);
        }
        const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
        const data = bytes.subarray(offset + 8, offset + 8 + length);
        const expectedCrc = bytes.readUInt32BE(offset + 8 + length);
        const actualCrc = crc32(
            bytes.subarray(offset + 4, offset + 8 + length),
        );
        if (actualCrc !== expectedCrc) {
            throw new Error(`${label} has an invalid ${type} checksum`);
        }

        if (type === "IHDR") {
            if (header || length !== 13) {
                throw new Error(`${label} has an invalid PNG header`);
            }
            header = {
                width: data.readUInt32BE(0),
                height: data.readUInt32BE(4),
                bitDepth: data[8],
                colorType: data[9],
                compression: data[10],
                filter: data[11],
                interlace: data[12],
            };
        } else if (type === "IDAT") imageData.push(data);
        else if (type === "IEND") {
            ended = true;
            offset = chunkEnd;
            break;
        }
        offset = chunkEnd;
    }

    if (
        !header ||
        !ended ||
        offset !== bytes.length ||
        imageData.length === 0
    ) {
        throw new Error(`${label} has an incomplete PNG structure`);
    }
    if (
        header.width < 320 ||
        header.height < 640 ||
        header.height <= header.width
    ) {
        throw new Error(
            `${label} must be a portrait capture of at least 320x640 (received ${header.width}x${header.height})`,
        );
    }
    const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[header.colorType];
    if (
        header.bitDepth !== 8 ||
        !channels ||
        header.compression !== 0 ||
        header.filter !== 0 ||
        header.interlace !== 0
    ) {
        throw new Error(`${label} uses an unsupported PNG pixel format`);
    }

    const pixels = decodePixels(
        Buffer.concat(imageData),
        header.width,
        header.height,
        channels,
    );
    let minimum = 255;
    let maximum = 0;
    const step = Math.max(channels, Math.floor(pixels.length / 50_000));
    for (let index = 0; index < pixels.length; index += step) {
        minimum = Math.min(minimum, pixels[index]);
        maximum = Math.max(maximum, pixels[index]);
    }
    if (maximum - minimum < 16) {
        throw new Error(`${label} appears to be blank`);
    }

    return { width: header.width, height: header.height };
}

export function validateScreenshotSet(captures) {
    if (captures.length === 0) throw new Error("No screenshots were captured");

    const names = new Set();
    const hashes = new Set();
    let dimensions;
    for (const capture of captures) {
        if (names.has(capture.name)) {
            throw new Error(`Duplicate screenshot scenario: ${capture.name}`);
        }
        names.add(capture.name);

        const current = validatePng(capture.bytes, capture.name);
        dimensions ??= current;
        if (
            current.width !== dimensions.width ||
            current.height !== dimensions.height
        ) {
            throw new Error(
                `${capture.name} is ${current.width}x${current.height}; expected ${dimensions.width}x${dimensions.height}`,
            );
        }

        const hash = createHash("sha256").update(capture.bytes).digest("hex");
        if (hashes.has(hash)) {
            throw new Error(`${capture.name} duplicates another screenshot`);
        }
        hashes.add(hash);
    }
    return dimensions;
}
