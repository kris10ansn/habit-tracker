import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migrations = new URL("../src/db/drizzle/", import.meta.url);

test("appearance upgrade preserves sync settings and persists each preference", async () => {
    const directory = await mkdtemp(
        path.join(os.tmpdir(), "settings-migration-"),
    );
    const filename = path.join(directory, "habits.db");
    let database = new DatabaseSync(filename);
    try {
        const existing = (await readdir(migrations))
            .filter((name) => name.endsWith(".sql") && name < "0008")
            .sort();
        for (const name of existing) {
            database.exec(await readFile(new URL(name, migrations), "utf8"));
        }
        database.exec(`INSERT INTO settings (id, syncServerUrl, lastSyncedAt, updatedAt)
            VALUES (0, 'https://example.test', 123, 456)`);
        database.exec(
            await readFile(
                new URL("0008_appearance_preference.sql", migrations),
                "utf8",
            ),
        );

        assert.equal(
            database.prepare("SELECT appearance FROM settings").get()
                .appearance,
            "system",
        );
        for (const preference of ["dark", "light", "system"]) {
            database
                .prepare("UPDATE settings SET appearance = ? WHERE id = 0")
                .run(preference);
            database.close();
            database = new DatabaseSync(filename);
            const row = database.prepare("SELECT * FROM settings").get();
            assert.equal(row.appearance, preference);
            assert.equal(row.syncServerUrl, "https://example.test");
            assert.equal(row.lastSyncedAt, 123);
            assert.equal(row.updatedAt, 456);
        }
        database.exec(
            "DELETE FROM settings; INSERT INTO settings (id, updatedAt) VALUES (0, 789)",
        );
        assert.equal(
            database.prepare("SELECT appearance FROM settings").get()
                .appearance,
            "system",
        );
    } finally {
        database.close();
        await rm(directory, { recursive: true, force: true });
    }
});
