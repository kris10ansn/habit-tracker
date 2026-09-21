import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

function storageHarness() {
    const requests = [];
    const context = vm.createContext({
        BuildProfile: { canWrite: () => true },
        console,
        XMLHttpRequest: class {
            DONE = 4;
            status = 0;
            open(method, url, asynchronous) {
                assert.equal(
                    asynchronous,
                    true,
                    `${method} ${url} blocks the UI`,
                );
                this.method = method;
                this.url = url;
            }
            send(body) {
                this.body = body;
                requests.push(this);
            }
            complete(body = "") {
                this.responseText = body;
                this.readyState = this.DONE;
                this.onreadystatechange();
            }
        },
    });
    const source = readFileSync(
        process.env.STORAGE_SOURCE || new URL("../src/js/Storage.js", import.meta.url),
        "utf8",
    );
    vm.runInContext(source.replace(/^\.import .*\n/gm, ""), context);
    return { storage: context, requests };
}

test("file loads return control before completion and never use synchronous XHR", () => {
    const { storage, requests } = storageHarness();
    let loaded = false;
    storage.readJson("/month.json", () => {
        loaded = true;
    });
    assert.equal(loaded, false);
    assert.equal(requests.length, 1);
    requests[0].complete('{"month":"2026-08"}');
    assert.equal(loaded, true);
});

test("each write finishes async verification before the next write or read starts", () => {
    const { storage, requests } = storageHarness();
    const results = [];
    storage.writeFile("/month.json", "first", (error) => results.push(error));
    storage.writeFile("/month.json", "latest", (error) => results.push(error));
    storage.readFile("/month.json", (value) => results.push(value));
    assert.equal(requests.length, 1);
    requests[0].complete();
    assert.equal(requests[1].method, "GET");
    assert.deepEqual(results, []);
    requests[1].complete("first");
    assert.deepEqual(results, [null]);
    assert.equal(requests[2].body, "latest");
    requests[2].complete();
    requests[3].complete("latest");
    assert.equal(requests[4].method, "GET");
    requests[4].complete("latest");
    assert.deepEqual(results, [null, null, "latest"]);
});

test("slow I/O on one file does not block independent files", () => {
    const { storage, requests } = storageHarness();
    storage.writeFile("/month.json", "pending", () => {});
    let loaded = false;
    storage.readFile("/settings.json", () => {
        loaded = true;
    });
    assert.equal(requests.length, 2);
    requests[1].complete("settings");
    assert.equal(loaded, true);
    assert.equal(requests[0].readyState, undefined);
});
