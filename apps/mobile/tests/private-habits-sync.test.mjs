import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { drizzle } from "drizzle-orm/sqlite-proxy";

import { habitDtoSchema } from "../src/api/gen/zod/habitDtoSchema.ts";
import { applySynced, gatherRequest } from "../src/db/repo/sync.ts";
import * as schema from "../src/db/schema.ts";

async function createDatabase() {
    const sqlite = new DatabaseSync(":memory:");
    const migrations = new URL("../src/db/drizzle/", import.meta.url);
    for (const name of (await readdir(migrations))
        .filter((name) => name.endsWith(".sql"))
        .sort()) {
        sqlite.exec(await readFile(new URL(name, migrations), "utf8"));
    }
    const db = drizzle(
        async (sql, params, method) => {
            const statement = sqlite.prepare(sql);
            if (method === "run") {
                statement.run(...params);
                return { rows: [] };
            }
            statement.setReturnArrays(true);
            return {
                rows:
                    method === "get"
                        ? statement.get(...params)
                        : statement.all(...params),
            };
        },
        { schema },
    );
    return { db, sqlite };
}

const privateHabit = {
    id: "eddf9c74-aadc-49eb-b81b-264593ed59f8",
    name: "Private habit",
    polarity: "Positive",
    position: 0,
    isPrivate: true,
    createdAt: 1,
    editedAt: 10,
    deletedAt: null,
};

test("synced privacy persists in SQLite and returns unchanged in the next request", async () => {
    const { db, sqlite } = await createDatabase();
    try {
        for (const isPrivate of [true, false, true]) {
            const authoritative = habitDtoSchema.parse({
                ...privateHabit,
                isPrivate,
            });
            await applySynced(
                db,
                { habits: [authoritative], months: [] },
                [],
                100,
            );
            const request = await gatherRequest(db, []);
            assert.deepEqual(request.habits, [authoritative]);
            assert.equal(
                sqlite.prepare("SELECT isPrivate FROM habits").get().isPrivate,
                isPrivate ? 1 : 0,
            );
        }
    } finally {
        sqlite.close();
    }
});

test("privacy survives edits made during sync and travels with tombstones", async () => {
    const { db, sqlite } = await createDatabase();
    try {
        const inFlightHabit = {
            ...privateHabit,
            name: "Renamed during sync",
            editedAt: 200,
        };
        const tombstone = {
            ...privateHabit,
            id: "9d73e78b-ddd5-433f-9e68-2a6a38298c8d",
            deletedAt: 50,
            editedAt: 50,
        };
        await db.insert(schema.habits).values([inFlightHabit, tombstone]);
        const request = await gatherRequest(db, []);
        assert.deepEqual(request.habits, [inFlightHabit, tombstone]);
        await applySynced(
            db,
            { habits: [{ ...privateHabit, isPrivate: false }], months: [] },
            [],
            100,
        );
        assert.deepEqual((await gatherRequest(db, [])).habits, [inFlightHabit]);
    } finally {
        sqlite.close();
    }
});
