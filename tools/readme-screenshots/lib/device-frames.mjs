import { execFileSync } from "node:child_process";
import {
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rename,
    rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PNG_SIGNATURE = "89504e470d0a1a0a";

export const deviceFrames = Object.freeze({
    remarkable: Object.freeze({
        crop: Object.freeze({ width: 930, height: 690, x: 0, y: 70 }),
        screen: Object.freeze({
            x: 79,
            y: 48,
            width: 808,
            height: 593,
            cornerRadius: 0,
        }),
        orientation: "landscape",
    }),
    android: Object.freeze({
        crop: Object.freeze({ width: 410, height: 780, x: 920, y: 35 }),
        screen: Object.freeze({
            x: 46,
            y: 55,
            width: 314,
            height: 672,
            cornerRadius: 36,
        }),
        camera: Object.freeze({ x: 205, y: 74, radius: 10 }),
        orientation: "portrait",
    }),
});

export const linkingScene = Object.freeze({
    crop: Object.freeze({ width: 1774, height: 887, x: 0, y: 0 }),
    slots: Object.freeze({
        remarkablePairing: Object.freeze({
            client: "remarkable",
            screen: Object.freeze({
                x: 79,
                y: 118,
                width: 808,
                height: 593,
                cornerRadius: 0,
            }),
        }),
        androidPairing: Object.freeze({
            client: "android",
            screen: Object.freeze({
                x: 966,
                y: 90,
                width: 314,
                height: 672,
                cornerRadius: 36,
            }),
            camera: Object.freeze({ x: 1125, y: 109, radius: 10 }),
        }),
        androidDevices: Object.freeze({
            client: "android",
            screen: Object.freeze({
                x: 1381,
                y: 89,
                width: 338,
                height: 675,
                cornerRadius: 36,
            }),
            camera: Object.freeze({ x: 1547, y: 109, radius: 10 }),
        }),
    }),
});

function executeMagick(arguments_) {
    try {
        execFileSync("magick", arguments_, {
            stdio: ["ignore", "ignore", "pipe"],
        });
    } catch (error) {
        if (error.code === "ENOENT") {
            throw new Error(
                "ImageMagick is required to generate framed screenshots (missing `magick` executable)",
            );
        }
        const detail = error.stderr?.toString().trim();
        throw new Error(
            `ImageMagick could not generate the device frame${detail ? `: ${detail}` : ""}`,
        );
    }
}

export function pngDimensions(bytes, label = "image") {
    if (
        bytes.length < 24 ||
        bytes.subarray(0, 8).toString("hex") !== PNG_SIGNATURE
    ) {
        throw new Error(`${label} is not a PNG`);
    }
    return {
        width: bytes.readUInt32BE(16),
        height: bytes.readUInt32BE(20),
    };
}

export function validateScreenshotDimensions(client, dimensions, screen) {
    const frame = deviceFrames[client];
    if (!frame) throw new Error(`Unknown device-frame client: ${client}`);
    const targetScreen = screen ?? frame.screen;

    const isLandscape = dimensions.width > dimensions.height;
    const expectedLandscape = frame.orientation === "landscape";
    if (isLandscape !== expectedLandscape) {
        throw new Error(
            `${client} screenshot must be ${frame.orientation}, got ${dimensions.width}x${dimensions.height}`,
        );
    }

    const screenshotRatio = dimensions.width / dimensions.height;
    const screenRatio = targetScreen.width / targetScreen.height;
    const mismatch = Math.abs(screenshotRatio / screenRatio - 1);
    if (mismatch > 0.12) {
        throw new Error(
            `${client} screenshot aspect ratio is too far from the ${targetScreen.width}x${targetScreen.height} frame window`,
        );
    }
}

function screenDraw(screen) {
    if (screen.cornerRadius === 0) {
        return `rectangle ${screen.x},${screen.y} ${screen.x + screen.width - 1},${screen.y + screen.height - 1}`;
    }
    return `roundrectangle ${screen.x},${screen.y} ${screen.x + screen.width - 1},${screen.y + screen.height - 1} ${screen.cornerRadius},${screen.cornerRadius}`;
}

async function renderComposition({
    crop,
    frameSourcePath,
    inserts,
    outputPath,
}) {
    const temporaryDirectory = await mkdtemp(
        path.join(os.tmpdir(), "habit-device-frame-"),
    );
    let currentPath = path.join(temporaryDirectory, "base.png");
    const stagedOutputPath = path.join(temporaryDirectory, "output.png");

    try {
        executeMagick([
            frameSourcePath,
            "-crop",
            `${crop.width}x${crop.height}+${crop.x}+${crop.y}`,
            "+repage",
            currentPath,
        ]);

        for (const [index, insert] of inserts.entries()) {
            const input = await readFile(insert.inputPath);
            validateScreenshotDimensions(
                insert.client,
                pngDimensions(input, path.basename(insert.inputPath)),
                insert.screen,
            );

            const fittedPath = path.join(
                temporaryDirectory,
                `fitted-${index}.png`,
            );
            const screenPath = path.join(
                temporaryDirectory,
                `screen-${index}.png`,
            );
            const nextPath = path.join(
                temporaryDirectory,
                `composed-${index}.png`,
            );

            executeMagick([
                insert.inputPath,
                "-resize",
                `${insert.screen.width}x${insert.screen.height}`,
                "-background",
                "#f4f4f2",
                "-gravity",
                "center",
                "-extent",
                `${insert.screen.width}x${insert.screen.height}`,
                "-alpha",
                "remove",
                fittedPath,
            ]);

            if (insert.screen.cornerRadius > 0) {
                const maskPath = path.join(
                    temporaryDirectory,
                    `mask-${index}.png`,
                );
                executeMagick([
                    "-size",
                    `${insert.screen.width}x${insert.screen.height}`,
                    "xc:black",
                    "-fill",
                    "white",
                    "-stroke",
                    "none",
                    "-draw",
                    `roundrectangle 0,0 ${insert.screen.width - 1},${insert.screen.height - 1} ${insert.screen.cornerRadius},${insert.screen.cornerRadius}`,
                    maskPath,
                ]);
                executeMagick([
                    fittedPath,
                    maskPath,
                    "-alpha",
                    "off",
                    "-compose",
                    "CopyOpacity",
                    "-composite",
                    screenPath,
                ]);
            } else {
                executeMagick([fittedPath, screenPath]);
            }

            const composeArguments = [
                currentPath,
                "-fill",
                "#f4f4f2",
                "-stroke",
                "none",
                "-draw",
                screenDraw(insert.screen),
                screenPath,
                "-geometry",
                `+${insert.screen.x}+${insert.screen.y}`,
                "-composite",
            ];
            if (insert.camera) {
                composeArguments.push(
                    "-fill",
                    "#050505",
                    "-stroke",
                    "#151515",
                    "-strokewidth",
                    "1",
                    "-draw",
                    `circle ${insert.camera.x},${insert.camera.y} ${insert.camera.x + insert.camera.radius},${insert.camera.y}`,
                );
            }
            composeArguments.push(nextPath);
            executeMagick(composeArguments);
            currentPath = nextPath;
        }

        executeMagick([
            currentPath,
            "-alpha",
            "off",
            "-strip",
            "-define",
            "png:exclude-chunks=date,time",
            stagedOutputPath,
        ]);

        const output = await readFile(stagedOutputPath);
        const dimensions = pngDimensions(output, path.basename(outputPath));
        if (
            dimensions.width !== crop.width ||
            dimensions.height !== crop.height
        ) {
            throw new Error(
                `${outputPath} is not ${crop.width}x${crop.height}`,
            );
        }

        await mkdir(path.dirname(outputPath), { recursive: true });
        await copyFile(stagedOutputPath, `${outputPath}.new`);
        await rename(`${outputPath}.new`, outputPath);
    } finally {
        await rm(temporaryDirectory, { recursive: true, force: true });
    }
}

export async function frameScreenshot({
    client,
    inputPath,
    outputPath,
    frameSourcePath,
}) {
    const frame = deviceFrames[client];
    if (!frame) throw new Error(`Unknown device-frame client: ${client}`);

    await renderComposition({
        crop: frame.crop,
        frameSourcePath,
        inserts: [
            {
                client,
                inputPath,
                screen: frame.screen,
                camera: frame.camera,
            },
        ],
        outputPath,
    });
}

export async function composeLinkingScene({
    frameSourcePath,
    inputs,
    outputPath,
}) {
    const inserts = Object.entries(inputs).map(([slotName, inputPath]) => {
        const slot = linkingScene.slots[slotName];
        if (!slot) throw new Error(`Unknown linking-scene slot: ${slotName}`);

        return { ...slot, inputPath };
    });
    if (inserts.length === 0) {
        throw new Error("The linking scene needs at least one screenshot");
    }

    await renderComposition({
        crop: linkingScene.crop,
        frameSourcePath,
        inserts,
        outputPath,
    });
}
