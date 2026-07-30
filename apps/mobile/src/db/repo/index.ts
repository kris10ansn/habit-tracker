// The only place that speaks the database. Reads return alive rows (deleted = false); writes stamp
// an epoch-ms `updatedAt` and, for clears/deletes, leave a tombstone rather than removing the row
// Drizzle's column modes make results already match the domain types, so there
// are no row mappers or casts. Screens go through the TanStack Query hooks in state/queries.
export * from "./entries";
export * from "./habits";
export * from "./streaks";
