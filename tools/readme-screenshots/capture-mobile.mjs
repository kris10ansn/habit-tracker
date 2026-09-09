#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import {
    copyFile,
    mkdir,
    mkdtemp,
    open,
    readFile,
    readdir,
    rename,
    rm,
} from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseAdbDevices, validateEmulatorTarget } from "./lib/adb.mjs";
import {
    chooseAvd,
    chooseEmulatorPort,
    discoverExpoGoUrl,
    EXPO_GO_APP_ID,
    expoGoRouteUrl,
    metroEnvironment,
    pngDimensions,
} from "./lib/expo-go.mjs";
import { loadFixture } from "./lib/fixture.mjs";
import { selectScenarios } from "./scenarios.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../..");
const flowPath = path.join(directory, "maestro/capture.yaml");
const fixturePath = path.join(directory, "fixture.json");
const defaultOutputDirectory = path.join(
    repositoryRoot,
    "docs/assets/screenshots",
);
const DEFAULT_METRO_PORT = 8090;
const STARTUP_TIMEOUT = 180_000;
const MAESTRO_TIMEOUT = 10 * 60_000;

class UsageError extends Error {}

export function parseArguments(arguments_) {
    const options = {
        metroPort: DEFAULT_METRO_PORT,
        outputDirectory: defaultOutputDirectory,
        keepEmulator: false,
    };
    const takeValue = (index, flag) => {
        const value = arguments_[index + 1];
        if (!value || value.startsWith("--")) {
            throw new UsageError(`${flag} requires a value`);
        }
        return value;
    };

    for (let index = 0; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        if (argument === "--") continue;
        if (argument === "--avd") {
            options.avd = takeValue(index, argument);
            index += 1;
        } else if (argument === "--serial") {
            options.serial = takeValue(index, argument);
            index += 1;
        } else if (argument === "--metro-port") {
            options.metroPort = Number(takeValue(index, argument));
            index += 1;
        } else if (argument === "--out-dir") {
            options.outputDirectory = path.resolve(takeValue(index, argument));
            index += 1;
        } else if (argument === "--keep-emulator") {
            options.keepEmulator = true;
        } else if (argument === "--help" || argument === "-h") {
            options.help = true;
        } else {
            throw new UsageError(`Unknown argument: ${argument}`);
        }
    }

    if (options.avd && options.serial) {
        throw new UsageError("--avd and --serial are mutually exclusive");
    }
    if (
        !Number.isInteger(options.metroPort) ||
        options.metroPort < 1024 ||
        options.metroPort > 65_535
    ) {
        throw new UsageError(
            "--metro-port must be an integer from 1024 to 65535",
        );
    }
    if (options.serial && !options.serial.startsWith("emulator-")) {
        throw new UsageError("--serial must identify a local Android emulator");
    }

    return options;
}

function printUsage(message) {
    if (message) process.stderr.write(`${message}\n\n`);
    process.stderr.write(
        "Usage: pnpm mobile:test:screenshots -- [--avd name | --serial emulator-5554] [--metro-port 8090] [--out-dir path] [--keep-emulator]\n",
    );
}

function androidTool(name) {
    const sdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
    if (!sdkRoot) return name;
    const directoryName = name === "adb" ? "platform-tools" : "emulator";
    return path.join(sdkRoot, directoryName, name);
}

function execute(executable, arguments_, options = {}) {
    return execFileSync(executable, arguments_, {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
        ...options,
    });
}

function adbDevices(adb) {
    return parseAdbDevices(execute(adb, ["devices", "-l"]));
}

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function spawnLogged(executable, arguments_, options, logPath) {
    const log = await open(logPath, "w");
    const child = spawn(executable, arguments_, {
        detached: true,
        stdio: ["ignore", log.fd, log.fd],
        ...options,
    });
    try {
        await new Promise((resolve, reject) => {
            child.once("spawn", resolve);
            child.once("error", reject);
        });
    } finally {
        await log.close();
    }
    return child;
}

async function runProcess(executable, arguments_, options = {}) {
    const { timeout = MAESTRO_TIMEOUT, ...spawnOptions } = options;
    return await new Promise((resolve, reject) => {
        const child = spawn(executable, arguments_, {
            stdio: "inherit",
            ...spawnOptions,
        });
        const timer = setTimeout(() => {
            child.kill("SIGTERM");
            reject(
                new Error(
                    `${executable} exceeded ${Math.round(timeout / 1000)} seconds`,
                ),
            );
        }, timeout);

        child.once("error", (error) => {
            clearTimeout(timer);
            reject(error);
        });
        child.once("exit", (code, signal) => {
            clearTimeout(timer);
            if (code === 0) resolve();
            else {
                reject(
                    new Error(
                        `${executable} exited with ${signal ?? `code ${code}`}`,
                    ),
                );
            }
        });
    });
}

function runningAvdName(adb, serial) {
    try {
        return execute(adb, ["-s", serial, "emu", "avd", "name"])
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line && line !== "OK");
    } catch {
        return undefined;
    }
}

async function startOrSelectEmulator(
    adb,
    emulatorExecutable,
    requestedAvd,
    requestedSerial,
    logPath,
) {
    const devices = adbDevices(adb);
    if (requestedSerial) {
        const target = devices.find(({ serial }) => serial === requestedSerial);
        if (!target) throw new Error(`${requestedSerial} is not listed by adb`);
        if (target.state !== "device") {
            validateEmulatorTarget(requestedSerial, target.state, "");
        }
        const qemu = execute(adb, [
            "-s",
            requestedSerial,
            "shell",
            "getprop",
            "ro.kernel.qemu",
        ]);
        validateEmulatorTarget(requestedSerial, target.state, qemu);
        return { serial: requestedSerial, owned: false };
    }

    const avds = execute(emulatorExecutable, ["-list-avds"])
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const avd = chooseAvd(avds, requestedAvd);
    const matching = devices.filter(
        ({ serial }) =>
            serial.startsWith("emulator-") &&
            runningAvdName(adb, serial) === avd,
    );
    if (matching.length === 1) {
        process.stdout.write(`reusing ${matching[0].serial} (${avd})\n`);
        return { serial: matching[0].serial, owned: false };
    }
    if (matching.length > 1) {
        throw new Error(`More than one running emulator uses AVD ${avd}`);
    }
    const nonReadyEmulators = devices.filter(
        ({ serial, state }) =>
            serial.startsWith("emulator-") && state !== "device",
    );
    if (nonReadyEmulators.length > 0) {
        throw new Error(
            `Wait for or stop the non-ready emulator(s) before starting ${avd}: ${nonReadyEmulators.map(({ serial, state }) => `${serial} (${state})`).join(", ")}`,
        );
    }

    const port = chooseEmulatorPort(devices);
    const serial = `emulator-${port}`;
    process.stdout.write(`starting ${avd} headlessly as ${serial}\n`);
    const child = await spawnLogged(
        emulatorExecutable,
        [
            "-avd",
            avd,
            "-port",
            String(port),
            "-no-window",
            "-no-audio",
            "-no-boot-anim",
            "-no-snapshot-save",
        ],
        {},
        logPath,
    );
    return { serial, owned: true, child, logPath };
}

async function waitForBoot(adb, emulator) {
    const deadline = Date.now() + STARTUP_TIMEOUT;
    let lastError;
    while (Date.now() < deadline) {
        if (emulator.child && emulator.child.exitCode !== null) {
            const log = await readFile(emulator.logPath, "utf8").catch(
                () => "",
            );
            throw new Error(
                `Android emulator exited during startup\n${log.split("\n").slice(-30).join("\n")}`,
            );
        }

        try {
            const target = adbDevices(adb).find(
                ({ serial }) => serial === emulator.serial,
            );
            if (target?.state === "device") {
                const booted = execute(adb, [
                    "-s",
                    emulator.serial,
                    "shell",
                    "getprop",
                    "sys.boot_completed",
                ]).trim();
                if (booted === "1") {
                    const qemu = execute(adb, [
                        "-s",
                        emulator.serial,
                        "shell",
                        "getprop",
                        "ro.kernel.qemu",
                    ]);
                    validateEmulatorTarget(emulator.serial, target.state, qemu);
                    return;
                }
            }
        } catch (error) {
            lastError = error;
        }
        await delay(1_000);
    }
    throw new Error(
        `${emulator.serial} did not finish booting${lastError ? `: ${lastError.message}` : ""}`,
    );
}

async function portIsAvailable(port) {
    return await new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.listen(port, "127.0.0.1", () => {
            server.close(() => resolve(true));
        });
    });
}

async function startMetro(port, logPath) {
    if (!(await portIsAvailable(port))) {
        throw new Error(`Metro port ${port} is already in use`);
    }

    return await spawnLogged(
        "pnpm",
        [
            "--filter",
            "@habit-tracker/mobile",
            "run",
            "test:go",
            "--",
            "--port",
            String(port),
            "--localhost",
        ],
        {
            cwd: repositoryRoot,
            env: metroEnvironment(process.env),
        },
        logPath,
    );
}

async function waitForExpoGoUrl(port, metroProcess, logPath) {
    const metroOrigin = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + STARTUP_TIMEOUT;
    let lastError;

    while (Date.now() < deadline) {
        if (metroProcess.exitCode !== null) {
            const log = await readFile(logPath, "utf8").catch(() => "");
            throw new Error(
                `Expo development server exited early\n${log.split("\n").slice(-30).join("\n")}`,
            );
        }

        try {
            return await discoverExpoGoUrl(metroOrigin, fetch);
        } catch (error) {
            lastError = error;
            await delay(1_000);
        }
    }
    throw (
        lastError ?? new Error("Expo development server did not become ready")
    );
}

function addReverse(adb, serial, port) {
    const mapping = `tcp:${port} tcp:${port}`;
    const existing = execute(adb, ["-s", serial, "reverse", "--list"]);
    if (existing.split(/\r?\n/).some((line) => line.endsWith(mapping))) {
        return false;
    }
    execute(adb, ["-s", serial, "reverse", `tcp:${port}`, `tcp:${port}`]);
    return true;
}

function requireExpoGo(adb, serial) {
    const packagePath = execute(adb, [
        "-s",
        serial,
        "shell",
        "pm",
        "path",
        EXPO_GO_APP_ID,
    ]).trim();
    if (!packagePath.startsWith("package:")) {
        throw new Error(
            `Expo Go is not installed on ${serial}. Install an SDK 56-compatible Expo Go client on this AVD once, then rerun the command.`,
        );
    }
}

async function runMaestro(serial, expoGoUrl, stagingDirectory, pairingCode) {
    const route = (value) => expoGoRouteUrl(expoGoUrl, value);
    const environment = {
        APP_ID: EXPO_GO_APP_ID,
        EXPO_ROOT_URL: route(""),
        EXPO_MONTH_URL: route("month"),
        EXPO_HABITS_URL: route("habits"),
        EXPO_SYNC_URL: route("sync"),
        EXPO_DEVICES_URL: route("devices"),
        EXPO_PAIRING_URL: route("link-device"),
        PAIRING_CODE: pairingCode,
    };
    const environmentArguments = Object.entries(environment).flatMap(
        ([name, value]) => ["-e", `${name}=${value}`],
    );

    await runProcess("maestro", [
        "--device",
        serial,
        "test",
        `--test-output-dir=${stagingDirectory}`,
        ...environmentArguments,
        flowPath,
    ]);
}

async function findFiles(directoryPath, basename, matches = []) {
    for (const entry of await readdir(directoryPath, { withFileTypes: true })) {
        const entryPath = path.join(directoryPath, entry.name);
        if (entry.isDirectory()) await findFiles(entryPath, basename, matches);
        else if (entry.name === basename) matches.push(entryPath);
    }
    return matches;
}

async function promoteScreenshots(stagingDirectory, outputDirectory) {
    const screenshots = [];
    for (const [, scenario] of selectScenarios("android")) {
        const matches = await findFiles(stagingDirectory, scenario.output);
        if (matches.length !== 1) {
            throw new Error(
                `Expected one ${scenario.output} from Maestro, found ${matches.length}`,
            );
        }
        const bytes = await readFile(matches[0]);
        const dimensions = pngDimensions(bytes);
        if (dimensions.height <= dimensions.width) {
            throw new Error(
                `${scenario.output} is not portrait (${dimensions.width}x${dimensions.height})`,
            );
        }
        screenshots.push({ source: matches[0], output: scenario.output });
    }

    await mkdir(outputDirectory, { recursive: true });
    for (const screenshot of screenshots) {
        const destination = path.join(outputDirectory, screenshot.output);
        await copyFile(screenshot.source, `${destination}.new`);
    }
    for (const screenshot of screenshots) {
        const destination = path.join(outputDirectory, screenshot.output);
        await rename(`${destination}.new`, destination);
        process.stdout.write(
            `wrote ${path.relative(repositoryRoot, destination)}\n`,
        );
    }
}

async function stopProcessGroup(child) {
    if (!child || child.exitCode !== null) return;
    try {
        process.kill(-child.pid, "SIGTERM");
    } catch (error) {
        if (error.code !== "ESRCH") throw error;
    }
    await Promise.race([
        new Promise((resolve) => child.once("exit", resolve)),
        delay(5_000),
    ]);
    if (child.exitCode === null) {
        try {
            process.kill(-child.pid, "SIGKILL");
        } catch (error) {
            if (error.code !== "ESRCH") throw error;
        }
    }
}

async function stopOwnedEmulator(adb, emulator) {
    if (!emulator?.owned) return;
    try {
        execute(adb, ["-s", emulator.serial, "emu", "kill"]);
        await Promise.race([
            new Promise((resolve) => emulator.child.once("exit", resolve)),
            delay(5_000),
        ]);
        if (emulator.child.exitCode === null) {
            await stopProcessGroup(emulator.child);
        }
        process.stdout.write(`stopped ${emulator.serial}\n`);
    } catch (error) {
        process.stderr.write(
            `Could not stop ${emulator.serial}: ${error.message}\n`,
        );
    }
}

async function main() {
    let options;
    try {
        options = parseArguments(process.argv.slice(2));
    } catch (error) {
        if (error instanceof UsageError) {
            printUsage(error.message);
            process.exitCode = 2;
            return;
        }
        throw error;
    }
    if (options.help) {
        printUsage();
        return;
    }

    const adb = androidTool("adb");
    const emulatorExecutable = androidTool("emulator");
    const temporaryDirectory = await mkdtemp(
        path.join(os.tmpdir(), "habit-mobile-screenshots-"),
    );
    const maestroOutput = path.join(temporaryDirectory, "maestro");
    const metroLog = path.join(temporaryDirectory, "metro.log");
    const emulatorLog = path.join(temporaryDirectory, "emulator.log");
    const fixture = await loadFixture(fixturePath);
    let metroProcess;
    let emulator;
    let reverseOwned = false;
    let succeeded = false;
    let cleanupStarted = false;

    const cleanup = async () => {
        if (cleanupStarted) return;
        cleanupStarted = true;

        if (reverseOwned && emulator) {
            try {
                execute(adb, [
                    "-s",
                    emulator.serial,
                    "reverse",
                    "--remove",
                    `tcp:${options.metroPort}`,
                ]);
            } catch {
                // The emulator may already have exited.
            }
        }
        await stopProcessGroup(metroProcess);
        if (!options.keepEmulator) await stopOwnedEmulator(adb, emulator);
    };
    const interrupt = () => {
        void cleanup().finally(() => process.exit(130));
    };
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", interrupt);

    try {
        metroProcess = await startMetro(options.metroPort, metroLog);
        emulator = await startOrSelectEmulator(
            adb,
            emulatorExecutable,
            options.avd,
            options.serial,
            emulatorLog,
        );
        await waitForBoot(adb, emulator);
        requireExpoGo(adb, emulator.serial);
        reverseOwned = addReverse(adb, emulator.serial, options.metroPort);
        const expoGoUrl = await waitForExpoGoUrl(
            options.metroPort,
            metroProcess,
            metroLog,
        );

        await mkdir(maestroOutput, { recursive: true });
        await runMaestro(
            emulator.serial,
            expoGoUrl,
            maestroOutput,
            fixture.pairing.code,
        );
        await promoteScreenshots(maestroOutput, options.outputDirectory);
        succeeded = true;
    } finally {
        process.removeListener("SIGINT", interrupt);
        process.removeListener("SIGTERM", interrupt);
        await cleanup();
        if (succeeded) await rm(temporaryDirectory, { recursive: true });
        else {
            process.stderr.write(`Kept diagnostics in ${temporaryDirectory}\n`);
        }
    }
}

const invokedAsScript = process.argv[1]
    ? pathToFileURL(path.resolve(process.argv[1])).href
    : undefined;
if (invokedAsScript === import.meta.url) {
    main().catch((error) => {
        process.stderr.write(`${error.stack ?? error.message}\n`);
        process.exitCode = 1;
    });
}
