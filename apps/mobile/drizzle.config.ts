import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` reads the schema and emits versioned SQL migrations (+ an expo bundle)
// into src/db/drizzle, applied at runtime by useMigrations in _layout.
export default defineConfig({
    dialect: "sqlite",
    driver: "expo",
    schema: "./src/db/schema.ts",
    out: "./src/db/drizzle",
});
