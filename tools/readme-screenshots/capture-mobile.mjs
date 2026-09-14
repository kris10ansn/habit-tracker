#!/usr/bin/env node

import {
    copyFile,
    mkdir,
    readFile,
    readdir,
    writeFile,
} from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAdbDevices, validateEmulatorTarget } from "./lib/adb.mjs";
import { captureNative } from "./lib/native-capture.mjs";
import { isMaestroConnectionFailure } from "./lib/maestro.mjs";
import { runCommand, startProcess, stopAllProcesses } from "./lib/process.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "../..");
const options = { port: 8082, scenario: "all", driver: "adb" };
for (let index = 2; index < process.argv.length; index++) {
    const argument = process.argv[index];
    if (argument === "--") continue;
    if (argument === "--serial") options.serial = process.argv[++index];
    else if (argument === "--port")
        options.port = Number(process.argv[++index]);
    else if (argument === "--driver") options.driver = process.argv[++index];
    else if (argument === "--scenario")
        options.scenario = process.argv[++index];
    else if (argument === "--help") {
        console.log(
            "Usage: npm run mobile:test:screenshots -- [--serial emulator-5554] [--port 8082] [--scenario today|all] [--driver adb|maestro]",
        );
        process.exit(0);
    } else throw new Error(`Unknown argument: ${argument}`);
}
if (
    !Number.isInteger(options.port) ||
    options.port < 1024 ||
    options.port > 65535
)
    throw new Error("Invalid --port");
if (!["today", "all"].includes(options.scenario))
    throw new Error("--scenario must be today or all");

if (!["maestro", "adb"].includes(options.driver))
    throw new Error("--driver must be maestro or adb");

const output = path.join(
    root,
    ".screenshots",
    new Date().toISOString().replaceAll(":", "-"),
);
await mkdir(output, { recursive: true });
const logs = path.join(output, "logs");
await mkdir(logs);
const startedAt = Date.now();
let stage = "preflight";
let cleanupPromise;
let aborting = false;
const report = {
    status: "running",
    output,
    driver: options.driver,
    stages: [],
};
function announce(next) {
    stage = next;
    report.stages.push({
        stage,
        elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
    });
    console.log(`[screenshots] ${stage}`);
}
const adb = (args, extra = {}) =>
    runCommand("adb", ["-s", options.serial, ...args], {
        timeoutMs: 10000,
        ...extra,
    });
function cleanup() {
    return (cleanupPromise ??= stopAllProcesses());
}
async function abortRun(reason, exitCode) {
    if (aborting) return;
    aborting = true;
    clearInterval(heartbeat);
    clearTimeout(overallDeadline);
    await cleanup();
    report.status = exitCode === 124 ? "timed-out" : "interrupted";
    report.error = reason;
    report.durationSeconds = Math.round((Date.now() - startedAt) / 1000);
    try {
        await writeFile(
            path.join(output, "report.json"),
            JSON.stringify(report, null, 2),
        );
        console.error(`[screenshots] ${reason}: ${output}`);
    } finally {
        process.exit(exitCode);
    }
}
process.on("SIGINT", () => void abortRun("Interrupted by SIGINT", 130));
process.on("SIGTERM", () => void abortRun("Interrupted by SIGTERM", 143));
const heartbeat = setInterval(
    () =>
        console.log(
            `[screenshots] ${stage} (${Math.round((Date.now() - startedAt) / 1000)}s elapsed)`,
        ),
    15000,
);
const overallDeadline = setTimeout(
    () => void abortRun("Overall five-minute deadline exceeded", 124),
    300000,
);

async function checkPort() {
    await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", () =>
            reject(
                new Error(
                    `Port ${options.port} is occupied. Choose --port <unused-port>.`,
                ),
            ),
        );
        server.listen(options.port, "127.0.0.1", () => server.close(resolve));
    });
}
async function waitForMetro(process_) {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
        if (process_.finished)
            throw new Error("Metro exited during startup; see logs/metro.log");
        try {
            const response = await fetch(
                `http://127.0.0.1:${options.port}/status`,
                { signal: AbortSignal.timeout(1500) },
            );
            if ((await response.text()) === "packager-status:running") return;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(
        "Metro did not start within 60 seconds; see logs/metro.log",
    );
}
async function waitForTestApp(metro) {
    const deadline = Date.now() + 60000;
    let checkedLaunch = false;
    const launchCheckAt = Date.now() + 5000;
    while (Date.now() < deadline) {
        if (metro.finished)
            throw new Error("Metro exited while loading the test app");
        const text = await readFile(path.join(logs, "metro.log"), "utf8");
        if (text.includes("TEST_MODE_READY")) return;
        // Expo Go can finish its launcher activity without opening the project after a
        // cold start. Resend the URL once only if Android left Expo Go in the background.
        if (!checkedLaunch && Date.now() >= launchCheckAt) {
            checkedLaunch = true;
            const activities = await adb([
                "shell",
                "dumpsys",
                "activity",
                "activities",
            ]);
            const resumed = activities
                .split("\n")
                .filter((line) =>
                    /mResumedActivity|topResumedActivity/.test(line),
                );
            if (
                resumed.length &&
                !resumed.some((line) => line.includes("host.exp.exponent"))
            ) {
                announce(
                    "Expo Go returned to the launcher; reopening the project once",
                );
                report.reopenedProject = true;
                await openProject();
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(
        "Test data and fonts were not ready within 60 seconds; see logs/metro.log",
    );
}
async function openProject() {
    await adb(
        [
            "shell",
            "am",
            "start",
            "-W",
            "-a",
            "android.intent.action.VIEW",
            "-d",
            `exp://10.0.2.2:${options.port}/--/`,
            "host.exp.exponent",
        ],
        { log: path.join(logs, "launch.log") },
    );
}
async function findScreenshots(folder) {
    const found = [];
    for (const entry of await readdir(folder, { withFileTypes: true })) {
        const full = path.join(folder, entry.name);
        if (entry.isDirectory()) found.push(...(await findScreenshots(full)));
        else if (/^android-.*\.png$/.test(entry.name)) found.push(full);
    }
    return found;
}

async function captureMaestro() {
    announce("Capturing screens with Maestro (180-second limit)");
    const maestroDeadline = Date.now() + 180000;
    report.attempts = [];
    let successfulArtifacts;
    for (let attempt = 1; attempt <= 3; attempt++) {
        const artifacts = path.join(output, "maestro", `attempt-${attempt}`);
        const maestroLog = path.join(logs, `maestro-${attempt}.log`);
        try {
            await runCommand(
                "maestro",
                [
                    "--verbose",
                    "--device",
                    options.serial,
                    "test",
                    "-e",
                    `EXPO_URL=exp://10.0.2.2:${options.port}`,
                    `--test-output-dir=${artifacts}`,
                    `--debug-output=${artifacts}`,
                    path.join(
                        directory,
                        "maestro",
                        options.scenario === "today"
                            ? "today.yaml"
                            : "capture.yaml",
                    ),
                ],
                {
                    cwd: root,
                    env: { CI: "true", MAESTRO_CLI_NO_ANALYTICS: "true" },
                    log: maestroLog,
                    timeoutMs: Math.max(1, maestroDeadline - Date.now()),
                },
            );
            report.attempts.push({ attempt, status: "passed" });
            successfulArtifacts = artifacts;
            break;
        } catch (error) {
            if (aborting) throw error;
            const diagnostic = await readFile(maestroLog, "utf8").catch(
                () => "",
            );
            const transportFailure = isMaestroConnectionFailure(diagnostic);
            const reason = diagnostic
                .replace(/\x1b\[[0-9;]*m/g, "")
                .split("\n")
                .find((line) =>
                    /DeviceServerDiedException|device offline|Android driver unreachable/.test(
                        line,
                    ),
                );
            report.attempts.push({
                attempt,
                status: "failed",
                error: reason ?? error.message,
            });
            if (
                !transportFailure ||
                attempt === 3 ||
                Date.now() + 15000 >= maestroDeadline
            )
                throw error;
            announce(
                `Maestro connection failed; reconnecting emulator for attempt ${attempt + 1}/3`,
            );
            await adb(["reconnect"]);
            await adb(["wait-for-device"]);
        }
    }
    return findScreenshots(successfulArtifacts);
}

try {
    announce("Checking emulator and tools");
    const devices = parseAdbDevices(await runCommand("adb", ["devices", "-l"]));
    const emulators = devices.filter(
        (device) =>
            device.serial.startsWith("emulator-") && device.state === "device",
    );
    if (!options.serial) {
        if (emulators.length !== 1)
            throw new Error(
                "Start one emulator, or choose one with --serial emulator-5554.",
            );
        options.serial = emulators[0].serial;
    }
    const target = devices.find((device) => device.serial === options.serial);
    if (
        !target ||
        !options.serial.startsWith("emulator-") ||
        target.state !== "device"
    )
        throw new Error(
            "Choose an online local emulator; physical devices are not supported by this command.",
        );
    validateEmulatorTarget(
        options.serial,
        target.state,
        await adb(["shell", "getprop", "ro.kernel.qemu"]),
    );
    if (
        !(await adb(["shell", "pm", "path", "host.exp.exponent"])).startsWith(
            "package:",
        )
    )
        throw new Error(
            "Install SDK 57-compatible Expo Go on this emulator first.",
        );
    report.serial = options.serial;
    if (options.driver === "maestro")
        report.maestroVersion = (
            await runCommand("maestro", ["--version"])
        ).trim();
    await runCommand(process.execPath, [
        path.join(directory, "generate-mobile-test-fixture.mjs"),
        "--check",
    ]);
    await checkPort();

    announce("Starting isolated screenshot Metro server");
    const metro = startProcess(
        process.execPath,
        [
            "--dns-result-order=ipv4first",
            path.join(root, "node_modules/expo/bin/cli"),
            "start",
            "--go",
            "--localhost",
            "--port",
            String(options.port),
        ],
        {
            cwd: path.join(root, "apps/mobile"),
            env: {
                APP_TEST_MODE: "1",
                APP_SCREENSHOT_MODE: "1",
                CI: "1",
                EXPO_OFFLINE: "1",
                EXPO_NO_TELEMETRY: "1",
                REACT_NATIVE_PACKAGER_HOSTNAME: "10.0.2.2",
            },
            log: path.join(logs, "metro.log"),
        },
    );
    await waitForMetro(metro);
    await adb(["shell", "input", "keyevent", "KEYCODE_WAKEUP"]);
    await adb(["shell", "wm", "dismiss-keyguard"]);
    // A fresh JS runtime reseeds the test data and returns the root route to Today.
    await adb(["shell", "am", "force-stop", "host.exp.exponent"]);
    announce("Loading fixture and fonts before starting the UI driver");
    await openProject();
    await waitForTestApp(metro);

    report.uiReadRetries = 0;
    report.adbCommandRetries = 0;
    const captures =
        options.driver === "adb"
            ? await captureNative({
                  adb,
                  url: `exp://10.0.2.2:${options.port}`,
                  output,
                  scenario: options.scenario,
                  announce,
                  onReadRetry: () => report.uiReadRetries++,
                  onCommandRetry: () => report.adbCommandRetries++,
              })
            : await captureMaestro();
    const expected =
        options.scenario === "today"
            ? ["today"]
            : ["today", "month", "habits", "sync", "devices", "pairing"];
    await mkdir(path.join(output, "screenshots"));
    for (const name of expected) {
        const source = captures.find(
            (file) => path.basename(file) === `android-${name}.png`,
        );
        if (!source)
            throw new Error(`Capture did not produce android-${name}.png`);
        const bytes = await readFile(source);
        if (
            bytes.length < 24 ||
            bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
            bytes.readUInt32BE(20) <= bytes.readUInt32BE(16)
        )
            throw new Error(`Invalid portrait PNG: ${source}`);
        await copyFile(
            source,
            path.join(output, "screenshots", path.basename(source)),
        );
    }
    report.status = "passed";
    report.screenshots = expected.map(
        (name) => `screenshots/android-${name}.png`,
    );
    announce(`Saved ${expected.length} screenshots`);
} catch (error) {
    report.status = "failed";
    report.error = error.message;
    console.error(`[screenshots] ${stage}: ${error.message}`);
    if (report.serial && !aborting) {
        await adb(["exec-out", "screencap", "-p"], {
            stdoutFile: path.join(output, "failure.png"),
        }).catch(() => {});
    }
    process.exitCode = 1;
} finally {
    clearInterval(heartbeat);
    clearTimeout(overallDeadline);
    if (report.serial && !aborting) {
        await adb(
            [
                "logcat",
                "-d",
                "-T",
                `${Math.floor(startedAt / 1000)}.000`,
                "-v",
                "threadtime",
                "ReactNativeJS:V",
                "AndroidRuntime:E",
                "dev.expo.updates:W",
                "DevMenu:W",
                "adbd:W",
                "*:S",
            ],
            { log: path.join(logs, "android.log") },
        ).catch((error) => {
            report.androidLogError = error.message;
        });
    }
    await cleanup();
    if (!aborting) {
        report.durationSeconds = Math.round((Date.now() - startedAt) / 1000);
        await writeFile(
            path.join(output, "report.json"),
            JSON.stringify(report, null, 2),
        );
        console.log(`[screenshots] ${report.status}: ${output}`);
    }
}
