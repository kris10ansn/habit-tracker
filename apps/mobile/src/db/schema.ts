import {
    index,
    integer,
    primaryKey,
    sqliteTable,
    text,
} from "drizzle-orm/sqlite-core";

// SQLite tables mirroring the backend's normalized shape (see docs/adr/0001): a roster plus a
// (habitId, date)-keyed entry log, each carrying an epoch-ms `updatedAt` merge key and a `deleted`
// soft-delete tombstone. The `enum` and `boolean` column modes make Drizzle infer the domain types
// (Polarity/Outcome unions, boolean `deleted`) directly, so reads need no row mappers or casts.
export const habits = sqliteTable("habits", {
    id: text().primaryKey(),
    name: text().notNull(),
    polarity: text({ enum: ["positive", "negative"] }).notNull(),
    position: integer().notNull(),
    updatedAt: integer().notNull(),
    deleted: integer({ mode: "boolean" }).notNull().default(false),
});

export const entries = sqliteTable(
    "entries",
    {
        habitId: text().notNull(),
        date: text().notNull(),
        outcome: text({ enum: ["success", "failure"] }).notNull(),
        updatedAt: integer().notNull(),
        deleted: integer({ mode: "boolean" }).notNull().default(false),
    },
    (table) => [
        primaryKey({ columns: [table.habitId, table.date] }),
        index("idx_entries_date").on(table.date),
    ],
);
