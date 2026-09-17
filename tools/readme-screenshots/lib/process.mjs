import { spawn } from "node:child_process";
import { openSync, closeSync } from "node:fs";

const activeProcesses = new Set();
let shuttingDown = false;

export async function stopAllProcesses() {
    shuttingDown = true;
    await Promise.all([...activeProcesses].map((process_) => process_.stop()));
}

// A separate process group lets deadlines stop the command's descendants too.
export function startProcess(
    executable,
    args,
    { log, stdoutFile, cwd, env } = {},
) {
    if (shuttingDown) throw new Error("Screenshot processes are shutting down");
    const descriptor = stdoutFile
        ? openSync(stdoutFile, "w")
        : log
          ? openSync(log, "a")
          : undefined;
    const child = spawn(executable, args, {
        cwd,
        env: { ...process.env, ...env },
        detached: true,
        stdio: [
            "ignore",
            descriptor ?? "pipe",
            stdoutFile ? "pipe" : (descriptor ?? "pipe"),
        ],
    });
    if (descriptor !== undefined) closeSync(descriptor);
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => (stdout += data));
    child.stderr?.on("data", (data) => (stderr += data));
    let finished = false;
    const done = new Promise((resolve) => {
        child.on("error", (error) => {
            finished = true;
            resolve({ code: null, error, stdout, stderr });
        });
        child.on("exit", () => {
            finished = true;
        });
        // Exit can fire before the last stdout chunk. Wait until pipes have drained.
        child.on("close", (code, signal) => {
            finished = true;
            resolve({ code, signal, stdout, stderr });
        });
    });
    function signalGroup(signal) {
        if (!child.pid) return;
        try {
            process.kill(-child.pid, signal);
        } catch (error) {
            if (error.code !== "ESRCH") throw error;
        }
    }
    let stopping;
    async function stopOnce() {
        signalGroup("SIGTERM");
        let graceTimer;
        await Promise.race([
            done,
            new Promise((resolve) => {
                graceTimer = setTimeout(resolve, 1500);
            }),
        ]);
        clearTimeout(graceTimer);
        // Also clean up descendants if the group leader exited first.
        signalGroup("SIGKILL");
        activeProcesses.delete(handle);
    }
    const handle = {
        done,
        stop: () => (stopping ??= stopOnce()),
        get finished() {
            return finished;
        },
    };
    activeProcesses.add(handle);
    return handle;
}

export async function runCommand(executable, args, options = {}) {
    const process_ = startProcess(executable, args, options);
    let timer;
    const deadline = new Promise((resolve) => {
        timer = setTimeout(
            () => resolve({ timedOut: true }),
            options.timeoutMs ?? 15000,
        );
    });
    const result = await Promise.race([process_.done, deadline]);
    clearTimeout(timer);
    await process_.stop();
    if (result.timedOut)
        throw new Error(
            `${executable} timed out after ${options.timeoutMs ?? 15000} ms`,
        );
    if (result.error) throw result.error;
    if (result.code !== 0) {
        throw new Error(
            `${executable} exited ${result.code ?? result.signal}: ${result.stderr?.trim() || options.log || "no diagnostic output"}`,
        );
    }
    return result.stdout;
}
