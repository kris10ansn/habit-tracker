import { Database } from "@/db/client";
import * as schema from "@/db/schema";
import { normalizeServerUrl } from "@/domain/serverUrl";

type Settings = typeof schema.settings.$inferSelect;

const normalizeSettings = (row: Settings): Settings => {
    const syncServerUrl = normalizeServerUrl(row.syncServerUrl);
    return syncServerUrl === row.syncServerUrl
        ? row
        : { ...row, syncServerUrl };
};

export async function getSettings(db: Database) {
    const row = await db.query.settings.findFirst();

    if (row) {
        return normalizeSettings(row);
    }

    const [createdRow] = await db
        .insert(schema.settings)
        .values({})
        .returning();

    return normalizeSettings(createdRow);
}

export type SettingsPatch = Partial<
    Omit<typeof schema.settings.$inferInsert, "id">
>;

export async function updateSettings(db: Database, patch: SettingsPatch) {
    const normalizedPatch =
        patch.syncServerUrl === undefined
            ? patch
            : {
                  ...patch,
                  syncServerUrl: normalizeServerUrl(patch.syncServerUrl),
              };

    const [row] = await db
        .insert(schema.settings)
        .values({
            id: 0,
            ...normalizedPatch,
        })
        .onConflictDoUpdate({
            target: schema.settings.id,
            set: { ...normalizedPatch, updatedAt: Date.now() },
        })
        .returning();

    return normalizeSettings(row);
}
