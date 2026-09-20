import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
    composeRemarkableShowcase,
    pngDimensions,
} from "../lib/device-frames.mjs";

const sourcePath = fileURLToPath(
    new URL(
        "../../../docs/assets/device-frames/remarkable-folio-front-source.png",
        import.meta.url,
    ),
);
const frameScript = fileURLToPath(
    new URL("../frame-screenshots.mjs", import.meta.url),
);

function pixels(imagePath) {
    return execFileSync("magick", [imagePath, "-depth", "8", "rgb:-"], {
        maxBuffer: 8 * 1024 * 1024,
    });
}

function pixel(bytes, x, y) {
    const offset = (y * 1448 + x) * 3;
    return [...bytes.subarray(offset, offset + 3)];
}

test("folio fits the screenshot without rotation and preserves the surrounding artwork", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "folio-test-"));
    const inputPath = path.join(directory, "remarkable-suspend.png");
    const outputPath = path.join(directory, "output.png");
    try {
        execFileSync("magick", ["-size", "400x300", "xc:white", inputPath]);
        await composeRemarkableShowcase({ inputPath, outputPath });
        const sourcePixels = pixels(sourcePath);
        assert.deepEqual(
            pixels(outputPath),
            sourcePixels,
            "white capture retains the blank screen lighting and all artwork",
        );

        execFileSync("magick", [
            "-size",
            "400x300",
            "xc:red",
            "-fill",
            "lime",
            "-draw",
            "rectangle 200,0 399,149",
            "-fill",
            "blue",
            "-draw",
            "rectangle 200,150 399,299",
            "-fill",
            "yellow",
            "-draw",
            "rectangle 0,150 199,299",
            inputPath,
        ]);
        // Exercise the normal refresh command, including the extra showcase output.
        const outputDirectory = path.join(directory, "framed");
        execFileSync(process.execPath, [
            frameScript,
            "--client",
            "remarkable",
            "--scenario",
            "suspend",
            "--input-dir",
            directory,
            "--out-dir",
            outputDirectory,
        ]);
        const showcasePath = path.join(
            outputDirectory,
            "remarkable-showcase.png",
        );
        assert.deepEqual(pngDimensions(await readFile(showcasePath)), {
            width: 1448,
            height: 1086,
        });
        assert.deepEqual(
            pngDimensions(
                await readFile(
                    path.join(outputDirectory, "remarkable-suspend.png"),
                ),
            ),
            { width: 930, height: 700 },
        );
        const outputPixels = pixels(showcasePath);
        for (const [x, y, channels] of [
            [400, 350, [true, false, false]],
            [1000, 350, [false, true, false]],
            [1000, 750, [false, false, true]],
            [400, 750, [true, true, false]],
        ]) {
            const actual = pixel(outputPixels, x, y);
            channels.forEach((present, index) =>
                assert.ok(
                    present ? actual[index] > 150 : actual[index] < 5,
                    `corner color at ${x},${y}: ${actual}`,
                ),
            );
        }
        for (const [x, y] of [
            [0, 0],
            [200, 400],
            [1240, 430],
            [1240, 750],
            [750, 950],
            [1400, 1000],
        ]) {
            assert.deepEqual(
                pixel(outputPixels, x, y),
                pixel(sourcePixels, x, y),
                "bezel, buttons, leather and background stay unchanged",
            );
        }
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test("invalid input or recalibrated source cannot overwrite a previous showcase", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "folio-invalid-"));
    const inputPath = path.join(directory, "input.png");
    const outputPath = path.join(directory, "output.png");
    try {
        await writeFile(outputPath, "previous output");
        execFileSync("magick", ["-size", "300x400", "xc:white", inputPath]);
        await assert.rejects(
            composeRemarkableShowcase({ inputPath, outputPath }),
            /landscape/,
        );
        execFileSync("magick", ["-size", "420x300", "xc:white", inputPath]);
        await assert.rejects(
            composeRemarkableShowcase({ inputPath, outputPath }),
            /4:3/,
        );
        execFileSync("magick", ["-size", "400x300", "xc:white", inputPath]);
        await assert.rejects(
            composeRemarkableShowcase({
                inputPath,
                outputPath,
                frameSourcePath: inputPath,
            }),
            /recalibrate/,
        );
        assert.equal(await readFile(outputPath, "utf8"), "previous output");
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
