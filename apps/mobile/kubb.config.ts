import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";

// Generates mobile's backend seam from the backend's own OpenAPI document. The input is the file
// `dotnet build` writes in apps/backend/ — the backend is the contract (see ../backend/CLAUDE.md),
// so the wire types are derived from it rather than retyped here and left to drift.
//
// Regenerate with `pnpm api:generate` (root: `pnpm mobile:api:generate`) after the backend's DTOs
// change, and commit the result: src/api/gen/ is checked in so `pnpm typecheck` and a fresh clone
// work without running codegen. Everything under src/api/gen/ is overwritten on each run — the only
// hand-written file in the seam is src/api/client.ts.
//
// No React Query plugin on purpose. Mobile is local-first: screens read SQLite through
// src/state/queries/*, and the backend's Habits CRUD endpoints must never be called from a screen.
// Generating hooks for them would put forbidden-but-idiomatic-looking code in the tree. Sync is
// gather-local -> POST -> apply-into-SQLite, and a generated mutation can only own the middle step,
// so the sync engine calls the generated `sync()` function directly. Add pluginReactQuery here if
// mobile ever gains an endpoint it genuinely reads over HTTP.
export default defineConfig({
    root: ".",
    input: {
        path: "../backend/openapi.json",
    },
    output: {
        path: "./src/api/gen",
        clean: true,
        barrelType: "named",
        // Emit extensionless relative imports. kubb defaults to writing `./Foo.ts`, which tsc
        // rejects without `allowImportingTsExtensions`; extensionless also matches how the rest of
        // the app imports (`@/db/client`), so nothing here is a special case for Metro to resolve.
        extension: { ".ts": "" },
    },
    plugins: [
        // Parses and validates the document; the other plugins read it through this one.
        // `generators: []` suppresses its own output — its default writes a JSON Schema dump per
        // component, which nothing here consumes.
        //
        // `contentType` pins which of the media types each operation advertises to generate from.
        // ASP.NET lists `application/json`, `text/json` and `application/*+json` for every action,
        // and kubb otherwise picks the last — which would make the client send a literal
        // `Content-Type: application/*+json`, a wildcard that is not a valid header value.
        pluginOas({
            validate: true,
            generators: [],
            contentType: "application/json",
        }),
        pluginTs({
            output: { path: "types" },
            // Plain string-union aliases (`type Outcome = "Success" | "Failure"`) rather than TS
            // enums, so the generated wire types and the hand-written domain unions in
            // src/domain/types.ts are the same type — the identity map becomes a compile-time fact.
            enumType: "literal",
            // The backend's DateOnly lands as `format: date`; mobile keeps dates as "YYYY-MM-DD"
            // strings end to end (domain/dates.ts owns the format), so never widen it to Date.
            dateType: "string",
            unknownType: "unknown",
        }),
        pluginZod({
            output: { path: "zod" },
            version: "4",
            dateType: "string",
            unknownType: "unknown",
        }),
        pluginClient({
            output: { path: "clients" },
            // The hand-written transport: base URL per call, throws on non-2xx. See src/api/client.ts.
            importPath: "@/api/client",
            // Operations resolve to the response body, not a {data, status, headers} envelope.
            dataReturnType: "data",
            // Run the response through the generated Zod schema before returning it. A Sync
            // response overwrites local SQLite wholesale, so a shape mismatch has to fail loudly at
            // the seam rather than silently corrupt the store.
            parser: "zod",
        }),
    ],
});
