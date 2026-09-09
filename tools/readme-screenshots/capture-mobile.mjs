#!/usr/bin/env node

import { spawn } from "node:child_process";
import { constants as fsConstants, createWriteStream } from "node:fs";
import {
    access,
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rename,
    rm,
    writeFile,
} from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAdbDevices, validateEmulatorTarget } from "./lib/adb.mjs";
import {
    chooseEmulatorPort,
    editableCenter,
    EXPO_GO_PACKAGE,
    expoGoRouteUrl,
    foregroundSummary,
    hasReverseRule,
    metroEnvironment,
    missingUiText,
    parseUiHierarchy,
    validatePng,
    validateScreenshotSet,
    visibleUiText,
} from "./lib/expo-go.mjs";
import { loadFixture } from "./lib/fixture.mjs";
import { selectScenarios } from "./scenarios.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../..");
const defaultOutputDirectory = path.join(
    repositoryRoot,
    "docs/assets/screenshots",
);
const generatedFixture = path.join(
    repositoryRoot,
    "apps/mobile/src/testMode/fixture.generated.ts",
);
const fixtureGenerator = path.join(
    directory,
    "generate-mobile-test-fixture.mjs",
);

function usage(message) {
    if (message) process.stderr.write(`${message}\n\n`);
    process.stderr.write(
        "Usage: pnpm mobile:test:screenshots -- (--avd <name> | --serial <emulator-serial>) [--port <port>] [--out-dir <path>] [--keep-temp] [--verbose]\n",
    );
    process.stderr.write(
        "  --avd starts that AVD headlessly; --serial reuses and preserves a running emulator.\n",
    );
    process.stderr.write(
        "  --verbose streams Metro output and logs each subprocess command.\n",
    );
    process.exit(message ? 2 : 0);
}

export function parseArguments(arguments_) {
    const options = {
        outDir: defaultOutputDirectory,
        port: 8081,
        portWasRequested: false,
        keepTemp: false,
        verbose: false,
    };

    for (let index = 0; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        if (argument === "--") continue;
        if (argument === "--avd") options.avd = arguments_[++index];
        else if (argument === "--serial") options.serial = arguments_[++index];
        else if (argument === "--port") {
            options.port = Number(arguments_[++index]);
            options.portWasRequested = true;
        } else if (argument === "--out-dir") {
            options.outDir = path.resolve(arguments_[++index] ?? "");
        } else if (argument === "--keep-temp") options.keepTemp = true;
        else if (argument === "--verbose") options.verbose = true;
        else if (argument === "--help" || argument === "-h") usage();
        else usage(`Unknown argument: ${argument}`);
    }

    if (Boolean(options.avd) === Boolean(options.serial)) {
        usage("Choose exactly one of --avd or --serial");
    }
    if (
        !Number.isInteger(options.port) ||
        options.port < 1024 ||
        options.port > 65535
    ) {
        usage("--port must be an integer between 1024 and 65535");
    }
    return options;
}

function commandText(executable, arguments_) {
    return [executable, ...arguments_]
        .map((part) =>
            /^[\w./:=+-]+$/.test(part) ? part : JSON.stringify(part),
        )
        .join(" ");
}

function debug(message) {
    if (options.verbose) process.stderr.write(`[debug] ${message}\n`);
}

async function execute(executable, arguments_, options = {}) {
    const {
        cwd = repositoryRoot,
        encoding = "utf8",
        env = process.env,
        timeoutMs = 30_000,
        allowFailure = false,
    } = options;

    const renderedCommand = commandText(executable, arguments_);
    const startedAt = Date.now();
    debug(`run ${renderedCommand}`);

    return await new Promise((resolve, reject) => {
        const child = spawn(executable, arguments_, {
            cwd,
            env,
            stdio: ["ignore", "pipe", "pipe"],
        });
        const stdout = [];
        const stderr = [];
        child.stdout.on("data", (chunk) => stdout.push(chunk));
        child.stderr.on("data", (chunk) => stderr.push(chunk));

        const timeout = setTimeout(() => {
            child.kill("SIGKILL");
        }, timeoutMs);
        child.once("error", (error) => {
            clearTimeout(timeout);
            debug(`could not start ${renderedCommand}: ${error.message}`);
            reject(
                new Error(
                    `Could not run ${executable}: ${error.message}. Check the prerequisites in tools/readme-screenshots/README.md.`,
                ),
            );
        });
        child.once("close", (code, signal) => {
            clearTimeout(timeout);
            const output = Buffer.concat(stdout);
            const errorOutput = Buffer.concat(stderr).toString("utf8").trim();
            debug(
                `${renderedCommand} ${signal ? `received ${signal}` : `exited ${code}`} after ${Date.now() - startedAt}ms`,
            );
            if (code !== 0 && !allowFailure) {
                reject(
                    new Error(
                        `${renderedCommand} failed${
                            signal ? ` (${signal})` : ` with exit code ${code}`
                        }${errorOutput ? `:\n${errorOutput}` : ""}`,
                    ),
                );
                return;
            }
            resolve(encoding === null ? output : output.toString(encoding));
        });
    });
}

async function executableFromAndroidSdk(name, relativePath) {
    const executableName = process.platform === "win32" ? `${name}.exe` : name;
    for (const sdkRoot of [
        process.env.ANDROID_HOME,
        process.env.ANDROID_SDK_ROOT,
    ]) {
        if (!sdkRoot) continue;
        const candidate = path.join(sdkRoot, relativePath, executableName);
        try {
            await access(candidate, fsConstants.X_OK);
            return candidate;
        } catch {}
    }
    return executableName;
}

async function startLoggedProcess(executable, arguments_, options) {
    const output = createWriteStream(options.logPath, { flags: "a" });
    const child = spawn(executable, arguments_, {
        cwd: options.cwd ?? repositoryRoot,
        env: options.env ?? process.env,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.pipe(output, { end: false });
    child.stderr.pipe(output, { end: false });
    if (options.verbose) {
        child.stdout.pipe(process.stderr, { end: false });
        child.stderr.pipe(process.stderr, { end: false });
    }

    await new Promise((resolve, reject) => {
        child.once("spawn", () => {
            debug(
                `started ${commandText(executable, arguments_)} as PID ${child.pid}; log: ${options.logPath}`,
            );
            resolve();
        });
        child.once("error", (error) =>
            reject(
                new Error(`Could not start ${executable}: ${error.message}`),
            ),
        );
    });
    const exited = new Promise((resolve) => {
        child.once("close", (code, signal) => {
            output.end();
            debug(
                `${commandText(executable, arguments_)} ${signal ? `received ${signal}` : `exited ${code}`}`,
            );
            resolve({ code, signal });
        });
    });
    return { child, exited, logPath: options.logPath };
}

function processIsRunning(process_) {
    return (
        process_?.child.exitCode === null && process_?.child.signalCode === null
    );
}

async function stopProcess(process_) {
    if (!processIsRunning(process_)) return;
    const pid = process_.child.pid;
    try {
        if (process.platform === "win32") process_.child.kill("SIGINT");
        else process.kill(-pid, "SIGINT");
    } catch {}

    const stopped = await Promise.race([
        process_.exited.then(() => true),
        delay(5_000).then(() => false),
    ]);
    if (stopped || !processIsRunning(process_)) return;
    try {
        if (process.platform === "win32") process_.child.kill("SIGKILL");
        else process.kill(-pid, "SIGKILL");
    } catch {}
    await process_.exited;
}

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function portIsAvailable(port) {
    return await new Promise((resolve) => {
        const server = net.createServer();
        server.unref();
        server.once("error", () => resolve(false));
        server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
            server.close(() => resolve(true));
        });
    });
}

async function selectMetroPort(options) {
    if (options.portWasRequested) {
        if (!(await portIsAvailable(options.port))) {
            throw new Error(
                `Port ${options.port} is already in use; stop that service or choose another --port`,
            );
        }
        return options.port;
    }

    for (let port = options.port; port < options.port + 20; port += 1) {
        if (await portIsAvailable(port)) return port;
    }
    throw new Error("No free Metro port was found between 8081 and 8100");
}

async function requestJson(url) {
    return await new Promise((resolve, reject) => {
        const request = http.get(url, { timeout: 2_000 }, (response) => {
            const chunks = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", () => {
                const body = Buffer.concat(chunks).toString("utf8");
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(
                        new Error(
                            `Expo development server returned HTTP ${response.statusCode}`,
                        ),
                    );
                    return;
                }
                try {
                    resolve(JSON.parse(body));
                } catch {
                    reject(
                        new Error(
                            "Expo development server returned invalid JSON",
                        ),
                    );
                }
            });
        });
        request.once("timeout", () => request.destroy(new Error("timed out")));
        request.once("error", reject);
    });
}

async function tail(file, lineCount = 25) {
    try {
        return (await readFile(file, "utf8"))
            .split(/\r?\n/)
            .slice(-lineCount)
            .join("\n");
    } catch {
        return "";
    }
}

async function waitForExpoGoUrl(metro, port) {
    const endpoint = new URL(`http://127.0.0.1:${port}/_expo/open`);
    endpoint.searchParams.set("platform", "android");
    endpoint.searchParams.set("runtime", "expo");
    const deadline = Date.now() + 90_000;
    let lastError;

    while (Date.now() < deadline) {
        if (!processIsRunning(metro)) {
            const result = await metro.exited;
            throw new Error(
                `Metro exited before it was ready (${result.signal ?? result.code}).\n${await tail(metro.logPath)}`,
            );
        }
        try {
            const result = await requestJson(endpoint);
            if (result.runtime !== "expo" || typeof result.url !== "string") {
                throw new Error("Expo did not return an Expo Go URL");
            }
            return expoGoRouteUrl(result.url, "");
        } catch (error) {
            lastError = error;
            await delay(750);
        }
    }
    throw new Error(
        `Metro did not become ready on IPv4 localhost: ${lastError?.message ?? "timed out"}.\n${await tail(metro.logPath)}`,
    );
}

function adbFor(adb, serial, arguments_) {
    return execute(adb, ["-s", serial, ...arguments_]);
}

async function adbBinary(adb, serial, arguments_) {
    return await execute(adb, ["-s", serial, ...arguments_], {
        encoding: null,
        timeoutMs: 60_000,
    });
}

async function waitForBoot(adb, serial, emulatorProcess) {
    const deadline = Date.now() + 240_000;
    let lastState = "not listed";
    while (Date.now() < deadline) {
        if (!processIsRunning(emulatorProcess)) {
            const result = await emulatorProcess.exited;
            throw new Error(
                `Android emulator exited during startup (${result.signal ?? result.code}).\n${await tail(emulatorProcess.logPath)}`,
            );
        }
        const devices = parseAdbDevices(
            await execute(adb, ["devices", "-l"], { timeoutMs: 10_000 }),
        );
        const target = devices.find((device) => device.serial === serial);
        lastState = target?.state ?? "not listed";
        if (target?.state === "device") {
            const booted = await adbFor(adb, serial, [
                "shell",
                "getprop",
                "sys.boot_completed",
            ]);
            if (booted.trim() === "1") return;
        }
        await delay(1_000);
    }
    throw new Error(
        `${serial} did not finish booting within four minutes (last adb state: ${lastState})`,
    );
}

async function validateRunningEmulator(adb, serial) {
    const devices = parseAdbDevices(await execute(adb, ["devices", "-l"]));
    const target = devices.find((device) => device.serial === serial);
    if (!target) throw new Error(`${serial} is not listed by adb`);
    const qemu =
        target.state === "device"
            ? await adbFor(adb, serial, ["shell", "getprop", "ro.kernel.qemu"])
            : "";
    validateEmulatorTarget(serial, target.state, qemu);
}

async function wakeDevice(adb, serial) {
    await adbFor(adb, serial, ["shell", "input", "keyevent", "KEYCODE_WAKEUP"]);
    await execute(adb, ["-s", serial, "shell", "wm", "dismiss-keyguard"], {
        allowFailure: true,
    });
}

async function readForeground(adb, serial) {
    const windowDump = await execute(
        adb,
        ["-s", serial, "shell", "dumpsys", "window", "windows"],
        { allowFailure: true, timeoutMs: 15_000 },
    );
    return { summary: foregroundSummary(windowDump), windowDump };
}

async function dumpUi(adb, serial, remotePath) {
    try {
        await adbFor(adb, serial, ["shell", "uiautomator", "dump", remotePath]);
        const xml = await adbFor(adb, serial, ["exec-out", "cat", remotePath]);
        return { nodes: parseUiHierarchy(xml), xml };
    } finally {
        await execute(adb, ["-s", serial, "shell", "rm", "-f", remotePath], {
            allowFailure: true,
            timeoutMs: 10_000,
        });
    }
}

async function captureFailureDiagnostics(
    adb,
    serial,
    diagnosticDirectory,
    scenarioName,
    uiHierarchy,
) {
    const prefix = path.join(diagnosticDirectory, `failure-${scenarioName}`);
    if (uiHierarchy) await writeFile(`${prefix}-ui.xml`, uiHierarchy);

    const { summary, windowDump } = await readForeground(adb, serial);
    await writeFile(`${prefix}-window.txt`, windowDump);

    try {
        const screenshot = await adbBinary(adb, serial, [
            "exec-out",
            "screencap",
            "-p",
        ]);
        await writeFile(`${prefix}.png`, screenshot);
    } catch {}

    return summary || "unavailable";
}

async function waitForUi(
    adb,
    serial,
    remotePath,
    expectedText,
    metroLog,
    diagnosticDirectory,
    scenarioName,
) {
    const startedAt = Date.now();
    const deadline = startedAt + 60_000;
    let nextProgressAt = 0;
    let lastNodes = [];
    let lastHierarchy = "";
    let lastError;
    while (Date.now() < deadline) {
        try {
            // The first bundle can take longer than an emulator's display timeout. WAKEUP is
            // idempotent, so keep the selected emulator visible without changing its settings.
            await wakeDevice(adb, serial);
            const dump = await dumpUi(adb, serial, remotePath);
            lastNodes = dump.nodes;
            lastHierarchy = dump.xml;
            const missingText = missingUiText(lastNodes, expectedText);
            if (missingText.length === 0) {
                await delay(500);
                process.stdout.write(
                    `  ${scenarioName} UI ready after ${Math.ceil((Date.now() - startedAt) / 1000)}s\n`,
                );
                return lastNodes;
            }

            if (options.verbose || Date.now() >= nextProgressAt) {
                const visible =
                    visibleUiText(lastNodes).slice(0, 12).join(" | ") || "none";
                const foreground =
                    (await readForeground(adb, serial)).summary ||
                    "unavailable";
                process.stdout.write(
                    `  waiting for ${scenarioName} UI (${Math.ceil((Date.now() - startedAt) / 1000)}s): missing ${missingText.join(", ")}; visible ${visible}; foreground ${foreground}\n`,
                );
                nextProgressAt = Date.now() + 5_000;
            }
        } catch (error) {
            lastError = error;
            if (options.verbose) {
                debug(`UI probe for ${scenarioName} failed: ${error.message}`);
            }
        }
        await delay(750);
    }

    const missing = missingUiText(lastNodes, expectedText).join(", ");
    const visible = visibleUiText(lastNodes).slice(0, 30).join(" | ") || "none";
    const foreground = await captureFailureDiagnostics(
        adb,
        serial,
        diagnosticDirectory,
        scenarioName,
        lastHierarchy,
    );
    throw new Error(
        `Timed out waiting for app UI (${missing || lastError?.message || "unknown readiness error"}).\nVisible emulator text: ${visible}\nForeground window: ${foreground}\nA failure screenshot, UI hierarchy, and window dump were retained with the logs.\nMetro log:\n${await tail(metroLog)}`,
    );
}

async function openRoute(adb, serial, url) {
    const result = await adbFor(adb, serial, [
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-c",
        "android.intent.category.BROWSABLE",
        "-d",
        url,
        EXPO_GO_PACKAGE,
    ]);
    if (/error:|unable to resolve intent/i.test(result)) {
        throw new Error(`Android could not open Expo Go:\n${result.trim()}`);
    }
}

async function enterPairingCode(adb, serial, nodes, code) {
    if (!/^[A-Z0-9]{6}$/.test(code)) {
        throw new Error(
            `Fixture pairing code cannot be entered safely: ${code}`,
        );
    }
    const center = editableCenter(nodes);
    await adbFor(adb, serial, [
        "shell",
        "input",
        "tap",
        String(center.x),
        String(center.y),
    ]);
    await adbFor(adb, serial, [
        "shell",
        "input",
        "keyevent",
        "KEYCODE_MOVE_END",
    ]);
    for (let index = 0; index < 6; index += 1) {
        await adbFor(adb, serial, [
            "shell",
            "input",
            "keyevent",
            "KEYCODE_DEL",
        ]);
    }
    await adbFor(adb, serial, ["shell", "input", "text", code]);
    await delay(750);
    // A Back event can reach Expo Router when the emulator has no visible IME and leave the
    // pairing route. Enter submits and blurs this single-line React Native input instead.
    await adbFor(adb, serial, ["shell", "input", "keyevent", "KEYCODE_ENTER"]);
}

async function promoteCaptures(captures, outputDirectory) {
    await mkdir(outputDirectory, { recursive: true });
    const pending = [];
    try {
        for (const capture of captures) {
            const destination = path.join(outputDirectory, capture.output);
            const temporary = `${destination}.new-${process.pid}`;
            await copyFile(capture.path, temporary);
            pending.push({ destination, temporary });
        }
        for (const file of pending)
            await rename(file.temporary, file.destination);
    } catch (error) {
        await Promise.all(
            pending.map((file) => rm(file.temporary, { force: true })),
        );
        throw error;
    }
}

const options = parseArguments(process.argv.slice(2));
const resources = {
    adb: undefined,
    serial: undefined,
    emulator: undefined,
    metro: undefined,
    reverseCreated: false,
    reversePort: undefined,
    temporaryDirectory: undefined,
    keepTemporaryDirectory: options.keepTemp,
};
let cleaningUp = false;

async function cleanup() {
    if (cleaningUp) return;
    cleaningUp = true;

    if (
        resources.reverseCreated &&
        resources.adb &&
        resources.serial &&
        resources.reversePort
    ) {
        debug(
            `removing adb reverse tcp:${resources.reversePort} created for ${resources.serial}`,
        );
        await execute(
            resources.adb,
            [
                "-s",
                resources.serial,
                "reverse",
                "--remove",
                `tcp:${resources.reversePort}`,
            ],
            { allowFailure: true, timeoutMs: 10_000 },
        );
    }
    if (processIsRunning(resources.metro))
        debug("stopping Metro started by this run");
    await stopProcess(resources.metro);

    if (resources.emulator && resources.adb && resources.serial) {
        debug(`stopping AVD ${resources.serial} started by this run`);
        await execute(resources.adb, ["-s", resources.serial, "emu", "kill"], {
            allowFailure: true,
            timeoutMs: 10_000,
        });
        const stopped = await Promise.race([
            resources.emulator.exited.then(() => true),
            delay(10_000).then(() => false),
        ]);
        if (!stopped) await stopProcess(resources.emulator);
    }

    if (resources.temporaryDirectory && !resources.keepTemporaryDirectory) {
        debug(`removing temporary directory ${resources.temporaryDirectory}`);
        await rm(resources.temporaryDirectory, {
            recursive: true,
            force: true,
        });
    }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
        resources.keepTemporaryDirectory = true;
        void cleanup().finally(() =>
            process.exit(signal === "SIGINT" ? 130 : 143),
        );
    });
}

async function main() {
    resources.temporaryDirectory = await mkdtemp(
        path.join(os.tmpdir(), "habit-tracker-mobile-screenshots-"),
    );
    const stagedDirectory = path.join(
        resources.temporaryDirectory,
        "screenshots",
    );
    await mkdir(stagedDirectory);
    process.stdout.write(
        `working directory: ${resources.temporaryDirectory} (kept on failure)\n`,
    );

    const adb = await executableFromAndroidSdk("adb", "platform-tools");
    resources.adb = adb;
    await execute(adb, ["version"]);
    await execute("pnpm", ["--version"]);
    await access(
        path.join(repositoryRoot, "node_modules/.bin/expo"),
        fsConstants.X_OK,
    ).catch(() => {
        throw new Error(
            "Workspace dependencies are missing; run pnpm install from the repository root first",
        );
    });
    await execute(process.execPath, [fixtureGenerator, "--check"]).catch(
        (error) => {
            throw new Error(
                `Generated mobile fixture is stale; run pnpm mobile:test:fixture first.\n${error.message}`,
            );
        },
    );
    await access(generatedFixture);
    const fixture = await loadFixture(path.join(directory, "fixture.json"));
    process.stdout.write("prerequisites and deterministic fixture verified\n");

    const initialDevices = parseAdbDevices(
        await execute(adb, ["devices", "-l"]),
    );
    if (options.serial) {
        resources.serial = options.serial;
        await validateRunningEmulator(adb, options.serial);
        process.stdout.write(`using existing emulator ${options.serial}\n`);
    } else {
        const emulator = await executableFromAndroidSdk("emulator", "emulator");
        const avds = (await execute(emulator, ["-list-avds"]))
            .split(/\r?\n/)
            .map((name) => name.trim())
            .filter(Boolean);
        if (!avds.includes(options.avd)) {
            throw new Error(
                `Unknown AVD ${options.avd}; available AVDs: ${avds.join(", ") || "none"}`,
            );
        }

        const emulatorPort = chooseEmulatorPort(initialDevices);
        resources.serial = `emulator-${emulatorPort}`;
        const emulatorLog = path.join(
            resources.temporaryDirectory,
            "emulator.log",
        );
        process.stdout.write(
            `starting headless AVD ${options.avd} as ${resources.serial}\n`,
        );
        resources.emulator = await startLoggedProcess(
            emulator,
            [
                "-avd",
                options.avd,
                "-port",
                String(emulatorPort),
                "-no-window",
                "-no-audio",
                "-no-boot-anim",
                "-no-snapshot",
            ],
            { logPath: emulatorLog, verbose: options.verbose },
        );
        await waitForBoot(adb, resources.serial, resources.emulator);
        await validateRunningEmulator(adb, resources.serial);
    }

    await wakeDevice(adb, resources.serial);

    const expoGoPath = await adbFor(adb, resources.serial, [
        "shell",
        "pm",
        "path",
        EXPO_GO_PACKAGE,
    ]);
    if (!expoGoPath.trim().startsWith("package:")) {
        throw new Error(
            `Expo Go (${EXPO_GO_PACKAGE}) is not installed on ${resources.serial}. Install an SDK 56-compatible Expo Go client in that AVD, open it once to clear onboarding, then retry.`,
        );
    }
    process.stdout.write(`verified Expo Go on ${resources.serial}\n`);

    const port = await selectMetroPort(options);
    const reverseList = await adbFor(adb, resources.serial, [
        "reverse",
        "--list",
    ]);
    if (!hasReverseRule(reverseList, resources.serial, port)) {
        await adbFor(adb, resources.serial, [
            "reverse",
            `tcp:${port}`,
            `tcp:${port}`,
        ]);
        resources.reverseCreated = true;
        resources.reversePort = port;
        process.stdout.write(
            `created adb reverse tcp:${port} -> tcp:${port} for ${resources.serial}\n`,
        );
    } else {
        process.stdout.write(
            `reusing existing adb reverse tcp:${port} -> tcp:${port} for ${resources.serial}\n`,
        );
    }

    const metroLog = path.join(resources.temporaryDirectory, "metro.log");
    process.stdout.write(`starting test-mode Expo on 127.0.0.1:${port}\n`);
    resources.metro = await startLoggedProcess(
        "pnpm",
        [
            "--filter",
            "@habit-tracker/mobile",
            "exec",
            "expo",
            "start",
            "--go",
            "--localhost",
            "--port",
            String(port),
            "--clear",
        ],
        {
            env: metroEnvironment(process.env),
            logPath: metroLog,
            verbose: options.verbose,
        },
    );
    const projectUrl = await waitForExpoGoUrl(resources.metro, port);
    process.stdout.write(`Expo Go launch URL ready: ${projectUrl}\n`);
    const remoteUiPath = `/data/local/tmp/habit-tracker-readme-${process.pid}.xml`;
    const captures = [];

    for (const [name, scenario] of selectScenarios("android")) {
        const routeUrl = expoGoRouteUrl(projectUrl, scenario.route);
        process.stdout.write(
            `capturing ${name}: opening ${routeUrl}; waiting for ${scenario.readyText.join(", ")}\n`,
        );
        await wakeDevice(adb, resources.serial);
        await openRoute(adb, resources.serial, routeUrl);
        let nodes = await waitForUi(
            adb,
            resources.serial,
            remoteUiPath,
            scenario.readyText,
            metroLog,
            resources.temporaryDirectory,
            name,
        );
        if (name === "pairing") {
            process.stdout.write("  entering deterministic pairing code\n");
            await enterPairingCode(
                adb,
                resources.serial,
                nodes,
                fixture.pairing.code,
            );
            nodes = await waitForUi(
                adb,
                resources.serial,
                remoteUiPath,
                [...scenario.readyText, fixture.pairing.deviceName],
                metroLog,
                resources.temporaryDirectory,
                name,
            );
        }

        const bytes = await adbBinary(adb, resources.serial, [
            "exec-out",
            "screencap",
            "-p",
        ]);
        const dimensions = validatePng(bytes, name);
        const screenshotPath = path.join(stagedDirectory, scenario.output);
        await writeFile(screenshotPath, bytes);
        captures.push({
            name,
            output: scenario.output,
            path: screenshotPath,
            bytes,
        });
        process.stdout.write(
            `  staged ${scenario.output} (${dimensions.width}x${dimensions.height}, ${bytes.length} bytes)\n`,
        );
    }

    const dimensions = validateScreenshotSet(captures);
    await promoteCaptures(captures, options.outDir);
    process.stdout.write(
        `wrote ${captures.length} validated ${dimensions.width}x${dimensions.height} screenshots to ${path.relative(repositoryRoot, options.outDir)}\n`,
    );
}

try {
    await main();
    await cleanup();
} catch (error) {
    resources.keepTemporaryDirectory = true;
    await cleanup();
    process.stderr.write(`\nScreenshot capture failed: ${error.message}\n`);
    if (resources.temporaryDirectory) {
        process.stderr.write(
            `Logs and staged files were kept at ${resources.temporaryDirectory}\n`,
        );
    }
    process.exitCode = 1;
}
