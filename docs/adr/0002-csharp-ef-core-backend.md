# Backend on C# / ASP.NET Core + EF Core over Postgres

We're adding a backend as a new top-level context (`apps/backend`) to own canonical persistence
and (eventually) sync. It's an **ASP.NET Core Web API (.NET 10)** using **EF Core** (code-first
migrations) over **PostgreSQL**, run locally via Docker Compose. Structure is a **single project
with folder layers** — `Controllers/ → Services/ → Entities/ + Data/ (DbContext)` — with
request/response DTOs at the controller boundary and a separate xUnit test project. It joins the
pnpm workspace via a thin `package.json` whose scripts shell out to `dotnet`, the same pattern
ADR 0001 set for the QML `apps/remarkable`.

## Considered options

- **C# / EF Core (chosen).** The user's preferred stack. Brings a different toolchain into an
  otherwise JS/TS + QML monorepo, hence this record — a future reader will wonder why.
- **A Node/TS backend** (sharing types with `apps/mobile`) was the "obvious" path for this repo and
  is explicitly *not* taken; the type-sharing upside didn't outweigh the user's stack preference,
  and the reMarkable client is QML and can't consume TS types anyway (see ADR 0001).
- **Full clean architecture** (Domain/Application/Infrastructure projects, repository interfaces,
  CQRS) was rejected as too heavy for CRUD-over-EF at this size — `DbContext` is already a
  Unit-of-Work + repository, so wrapping it again is ceremony with no payoff yet.
- **SQLite** was rejected as the primary store: no native uuid/date/timestamp/enum types and a
  likely re-platform to Postgres before any real deploy.

## Consequences

- `pnpm format`/`pnpm lint` aggregates now include the backend (via `dotnet format`); root gains
  `backend:*` delegators alongside `remarkable:*` and `mobile:*`.
- Postgres is a local dependency for running/testing the backend (`docker compose up`); contributors
  need Docker. EF migrations are the schema source of truth.
- Backend-specific domain decisions live in `apps/backend/docs/adr/`; this root `docs/adr/` keeps
  only system-wide ones (per ADR 0001). The data-model decision is `apps/backend/docs/adr/0001`.
