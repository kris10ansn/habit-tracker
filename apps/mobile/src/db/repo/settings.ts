import { Database } from "@/db/client";
import * as schema from "@/db/schema";

export async function getSettings(db: Database) {
    const row = await db.query.settings.findFirst();

    if (row) {
        return row;
    }

    const [createdRow] = await db
        .insert(schema.settings)
        .values({})
        .returning();

    return createdRow;
}

export type SettingsPatch = Partial<
    Omit<typeof schema.settings.$inferInsert, "id">
>;

export async function updateSettings(db: Database, patch: SettingsPatch) {
    const [row] = await db
        .insert(schema.settings)
        .values({
            id: 0,
            ...patch,
        })
        .onConflictDoUpdate({
            target: schema.settings.id,
            set: { ...patch, updatedAt: Date.now() },
        })
        .returning();

    return row;
}
