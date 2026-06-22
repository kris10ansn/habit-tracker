# Backend — Habit Tracker API

ASP.NET Core (.NET 10) Web API over EF Core + PostgreSQL. Owns the canonical Habit/Entry records
and (eventually) sync. It does **not** mirror the clients' on-device shape — it stores the same data
reframed for a relational API. See the decisions in
[`docs/adr/0001`](./docs/adr/0001-data-model-deviates-from-client-marks.md) and the system-wide
[`../../docs/adr/0002`](../../docs/adr/0002-csharp-ef-core-backend.md), and the vocabulary in
[`CONTEXT.md`](./CONTEXT.md).

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
Enums serialize as strings (`"Positive"`, `"Success"`). Entries are modelled
(`(HabitId, Date)` keyed, `Outcome {Success, Failure}`) but not yet exposed over HTTP — habits are
the first vertical slice.
