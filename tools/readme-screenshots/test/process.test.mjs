import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runCommand } from "../lib/process.mjs";

test("captures a command's output", async () => {
    assert.equal(
        await runCommand(process.execPath, ["-e", "console.log('ready')"]),
        "ready\n",
    );
});

test("drains large stdout before reporting completion", async () => {
    const output = await runCommand(process.execPath, [
        "-e",
        "process.stdout.write('x'.repeat(1000000), () => process.exit(0))",
    ]);
    assert.equal(output.length, 1000000);
});

test("keeps stderr out of binary screenshot output", async () => {
    const directory = await mkdtemp(
        path.join(os.tmpdir(), "screenshot-binary-"),
    );
    const filename = path.join(directory, "capture.bin");
    try {
        await assert.rejects(
            runCommand(
                process.execPath,
                [
                    "-e",
                    "process.stdout.write(Buffer.from([0, 255, 10])); console.error('capture failed'); process.exitCode = 3",
                ],
                { stdoutFile: filename },
            ),
            /capture failed/,
        );
        assert.deepEqual(await readFile(filename), Buffer.from([0, 255, 10]));
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test("reports a failed command with its diagnostic", async () => {
    await assert.rejects(
        runCommand(process.execPath, [
            "-e",
            "console.error('broken'); process.exit(7)",
        ]),
        /exited 7: broken/,
    );
});

test("terminates an unresponsive command that ignores SIGTERM", async () => {
    const started = Date.now();
    await assert.rejects(
        runCommand(
            process.execPath,
            [
                "-e",
                "process.on('SIGTERM', () => {}); setInterval(() => {}, 100)",
            ],
            { timeoutMs: 300 },
        ),
        /timed out/,
    );
    assert.ok(
        Date.now() - started < 4000,
        "deadline and forced cleanup must stay bounded",
    );
});

test("timeout stops descendants even when they ignore SIGTERM", async () => {
    const directory = await mkdtemp(
        path.join(os.tmpdir(), "screenshot-process-"),
    );
    const heartbeat = path.join(directory, "heartbeat");
    const descendant = `
        const { appendFileSync } = require('node:fs');
        process.on('SIGTERM', () => {});
        setInterval(() => appendFileSync(process.argv[1], '.'), 25);
    `;
    const parent = `
        require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}, process.argv[1]], { stdio: 'ignore' });
        process.on('SIGTERM', () => {});
        setInterval(() => {}, 100);
    `;
    try {
        await assert.rejects(
            runCommand(process.execPath, ["-e", parent, heartbeat], {
                timeoutMs: 500,
            }),
            /timed out/,
        );
        const stopped = await readFile(heartbeat, "utf8");
        assert.ok(stopped.length > 0, "descendant must have started");
        await new Promise((resolve) => setTimeout(resolve, 150));
        assert.equal(await readFile(heartbeat, "utf8"), stopped);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test("shutdown rejects late retries while existing processes are stopping", async () => {
    const moduleUrl = new URL("../lib/process.mjs", import.meta.url).href;
    const script = `
        import assert from 'node:assert/strict';
        import { startProcess, stopAllProcesses } from ${JSON.stringify(moduleUrl)};
        startProcess(process.execPath, ['-e', 'setInterval(() => {}, 100)']);
        const stopping = stopAllProcesses();
        assert.throws(() => startProcess(process.execPath, ['-e', 'process.exit(9)']), /shutting down/);
        await stopping;
        console.log('blocked');
    `;
    assert.equal(
        await runCommand(process.execPath, [
            "--input-type=module",
            "-e",
            script,
        ]),
        "blocked\n",
    );
});
