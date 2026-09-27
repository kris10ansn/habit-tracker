import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
    composeAndroidAppearanceShowcase,
    pngDimensions,
} from "../lib/device-frames.mjs";

const frameScript = fileURLToPath(
    new URL("../frame-screenshots.mjs", import.meta.url),
);
const frameSourcePath = fileURLToPath(
    new URL(
        "../../../docs/assets/device-frames/device-family-source.png",
        import.meta.url,
    ),
);

function pixels(imagePath) {
    return execFileSync("magick", [imagePath, "-depth", "8", "rgb:-"]);
}

function pixel(bytes, x, y) {
    const offset = (y * 407 + x) * 3;
    return [...bytes.subarray(offset, offset + 3)];
}

test("normal Today framing generates an aligned diagonal split with a stable bezel", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "appearance-test-"));
    try {
        await mkdir(path.join(directory, "dark-mode"));
        const lightPath = path.join(directory, "dark-mode/light-today.png");
        const darkPath = path.join(directory, "dark-mode/dark-today.png");
        // Exact frame ratio; a shared green stripe checks vertical alignment across the seam.
        for (const [inputPath, color] of [
            [lightPath, "red"],
            [darkPath, "blue"],
        ]) {
            execFileSync("magick", [
                "-size",
                "315x707",
                `xc:${color}`,
                "-fill",
                "lime",
                "-draw",
                "rectangle 0,345 314,360",
                inputPath,
            ]);
        }
        await writeFile(
            path.join(directory, "android-today.png"),
            await readFile(lightPath),
        );
        const outDir = path.join(directory, "framed");
        const args = [
            frameScript,
            "--client",
            "android",
            "--scenario",
            "today",
            "--input-dir",
            directory,
            "--out-dir",
            outDir,
        ];
        execFileSync(process.execPath, args);
        const outputPath = path.join(outDir, "android-appearance-showcase.png");
        const first = await readFile(outputPath);
        assert.deepEqual(pngDimensions(first), { width: 407, height: 812 });
        const composite = pixels(outputPath);
        for (const [x, y, expected] of [
            [65, 100, [255, 0, 0]],
            [245, 100, [255, 0, 0]],
            [25, 600, [255, 0, 0]],
            [245, 600, [0, 0, 255]],
            [300, 200, [0, 0, 255]],
            [65, 353, [0, 255, 0]],
            [245, 353, [0, 255, 0]],
        ]) {
            assert.deepEqual(
                pixel(composite, 43 + x, 52 + y),
                expected,
                `screen pixel ${x},${y}`,
            );
        }
        const framedLight = pixels(path.join(outDir, "android-today.png"));
        for (const [x, y] of [
            [0, 0],
            [30, 400],
            [380, 400],
            [200, 790],
        ]) {
            assert.deepEqual(pixel(composite, x, y), pixel(framedLight, x, y));
        }
        execFileSync(process.execPath, args);
        assert.deepEqual(
            await readFile(outputPath),
            first,
            "regeneration is byte-identical",
        );
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test("missing or mismatched appearance captures cannot overwrite the showcase", async () => {
    const directory = await mkdtemp(
        path.join(os.tmpdir(), "appearance-invalid-"),
    );
    try {
        const lightPath = path.join(directory, "light.png");
        const darkPath = path.join(directory, "dark.png");
        const outputPath = path.join(directory, "output.png");
        await writeFile(outputPath, "previous output");
        execFileSync("magick", ["-size", "315x707", "xc:white", lightPath]);
        const options = { lightPath, darkPath, outputPath, frameSourcePath };
        await assert.rejects(
            composeAndroidAppearanceShowcase(options),
            /ENOENT/,
        );
        execFileSync("magick", ["-size", "630x1414", "xc:black", darkPath]);
        await assert.rejects(
            composeAndroidAppearanceShowcase(options),
            /identical dimensions/,
        );
        assert.equal(await readFile(outputPath, "utf8"), "previous output");
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
