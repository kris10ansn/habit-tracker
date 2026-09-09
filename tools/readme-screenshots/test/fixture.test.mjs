import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    loadFixture,
    remarkableProjection,
    validateFixture,
    writeRemarkableFixture,
} from "../lib/fixture.mjs";
import { scenarios, selectScenarios } from "../scenarios.mjs";

const fixturePath = new URL("../fixture.json", import.meta.url);

test("canonical fixture is internally consistent", async () => {
    const fixture = await loadFixture(fixturePath);
    assert.equal(fixture.today, "2026-09-09");
    assert.equal(
        fixture.sessions.filter((session) => session.isCurrentDevice).length,
        1,
    );
});

test("reMarkable projection preserves order and converts outcomes", async () => {
    const fixture = await loadFixture(fixturePath);
    const projection = remarkableProjection(fixture);
    assert.deepEqual(
        projection.roster.habits.map((habit) => habit.id),
        fixture.habits.map((habit) => habit.id),
    );
    assert.deepEqual(
        new Set(projection.month.entries.map((entry) => entry.outcome)),
        new Set(["x", "o"]),
    );
    assert.equal(
        projection.roster.habits.find((habit) => habit.name === "Medication")
            .isPrivate,
        true,
    );
});

test("materializer writes paired and pairing-safe settings separately", async () => {
    const fixture = await loadFixture(fixturePath);
    const directory = await mkdtemp(
        path.join(os.tmpdir(), "habit-screenshots-test-"),
    );
    await writeRemarkableFixture(fixture, directory);
    const paired = JSON.parse(
        await readFile(path.join(directory, "settings.json"), "utf8"),
    );
    const pairing = JSON.parse(
        await readFile(path.join(directory, "settings-pairing.json"), "utf8"),
    );
    assert.notEqual(paired.token, "");
    assert.equal(pairing.token, "");
});

test("validator rejects duplicate entry identities", async () => {
    const fixture = await loadFixture(fixturePath);
    fixture.entries.push({ ...fixture.entries[0] });
    assert.throws(() => validateFixture(fixture), /duplicate entry/);
});

test("scenario selection is explicit", () => {
    assert.equal(Object.keys(scenarios.remarkable).length, 5);
    assert.equal(Object.keys(scenarios.android).length, 6);
    assert.deepEqual(selectScenarios("android", "devices")[0][0], "devices");
    assert.throws(
        () => selectScenarios("android", "grid"),
        /Unknown android scenario/,
    );
});
