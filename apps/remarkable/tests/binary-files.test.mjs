import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(
    new URL("../src/js/BinaryFiles.js", import.meta.url),
    "utf8",
);

function writeWithReadback(expected, readback) {
    const deferred = [];
    const context = vm.createContext({
        console,
        Qt: { callLater: (callback) => deferred.push(callback) },
        XMLHttpRequest: class {
            DONE = 4;
            status = 0;
            open(method) {
                this.method = method;
            }
            send() {
                this.response = this.method === "GET" ? readback.buffer : null;
                this.readyState = this.DONE;
                this.onreadystatechange();
            }
        },
    });
    vm.runInContext(source, context);
    const results = [];
    context.write("fixture.bin", expected.buffer, (error) =>
        results.push(error),
    );
    while (deferred.length) deferred.shift()();
    assert.equal(results.length, 1);
    return results[0];
}

test("binary write verifies complete words, chunk boundaries, and trailing bytes", () => {
    for (const length of [1, 2, 3, 4, 5, 16383, 16384, 16385, 32771]) {
        const expected = Uint8Array.from({ length }, (_, index) => index % 251);
        assert.equal(writeWithReadback(expected, expected.slice()), null);
        const offsets = [0, 1, 2, 3, length - 1, 16383, 16384].filter(
            (index) => index < length,
        );
        for (const offset of new Set(offsets)) {
            const stale = expected.slice();
            stale[offset] ^= 255;
            assert.match(
                writeWithReadback(expected, stale),
                /binary write failed/,
                `length ${length}, byte ${offset}`,
            );
        }
        assert.match(
            writeWithReadback(expected, expected.slice(0, -1)),
            /binary write failed/,
        );
    }
});
