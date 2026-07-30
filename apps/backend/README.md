# Backend — Habit Tracker API

ASP.NET Core (.NET 10) Web API over EF Core + PostgreSQL. Owns the canonical Habit/Entry records and
performs Sync — it is the one place the clients' state is reconciled. It does **not** mirror the
clients' on-device shape; it stores the same data reframed for a relational API. See the vocabulary
in [`CONTEXT.md`](./CONTEXT.md) and the agent guidance in [`CLAUDE.md`](./CLAUDE.md).

## Layout

```
src/HabitTracker.Api/        single Web API project, folder layers:
  Controllers/               HTTP endpoints, DTOs in / out
  Services/                  app logic (talks to DbContext directly)
  Entities/                  EF entities + domain enums (Polarity, Outcome)
  Data/                      DbContext, model config, seed, timestamp stamping
  Dtos/                      request/response records
  Migrations/                EF Core migrations (schema source of truth)
tests/HabitTracker.Api.Tests/  xUnit tests (EF in-memory)
docker-compose.yml             local PostgreSQL
```

Auth is deferred: every request acts as a single seeded **stub user** (`CurrentUser`) — the one seam
to replace when authentication lands.

## Prerequisites

- .NET 10 SDK
- Docker (for PostgreSQL)

## Run it

From this directory (or use the root `pnpm backend:*` delegators):

```bash
pnpm db:up        # start PostgreSQL in Docker
pnpm migrate      # apply EF migrations to the database
pnpm start        # run the API (http://localhost:5137)
```

`src/HabitTracker.Api/HabitTracker.Api.http` has ready-to-run requests for the Habits endpoints. In
Development, the OpenAPI document is served at `/openapi/v1.json`.

## Develop

```bash
pnpm build        # compile
pnpm test         # run tests (no database needed — EF in-memory)
pnpm format       # dotnet format
pnpm lint         # dotnet format --verify-no-changes
```

### Migrations

The EF tool is a repo-local tool (`.config/dotnet-tools.json`); run `dotnet tool restore` once, then:

```bash
dotnet ef migrations add <Name> --project src/HabitTracker.Api
pnpm migrate      # = dotnet ef database update
```

## API

`/api/habits` — list / get / create / update / delete habits for the current (stub) user.
Enums serialize as strings (`"Positive"`, `"Success"`). Delete is a **soft-delete** (tombstone), so a
removed habit stops appearing but can still lose/win a sync merge.

`/api/sync` (POST) — one round-trip offline-first sync. The client submits its roster +
the month(s) it holds — alive rows and `deleted` tombstones, each carrying an `updatedAt` (epoch
milliseconds UTC); the server merges per row **last-write-wins** by that edit-time and returns the
authoritative **alive** state to overwrite local with. Edit-time is stored verbatim as the merge
key, distinct from the server-stamped `UpdatedAt` audit field. `Entry` `(HabitId, Date)`-keyed with
`Outcome {Success, Failure}` is now exposed through sync. See `HabitTracker.Api.http` for a sample.
