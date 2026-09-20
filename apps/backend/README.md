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
  Entities/                  EF entities + domain enums (Polarity, Outcome, PairingStatus)
  Authentication/            bearer-token auth handler, claim names, OpenAPI security scheme
  Data/                      DbContext, model config, timestamp stamping
  Dtos/                      request/response records
  Migrations/                EF Core migrations (schema source of truth)
tests/HabitTracker.Api.Tests/  xUnit tests (EF in-memory)
docker-compose.yml             local PostgreSQL
```

Every endpoint requires an `Authorization: Bearer <token>` session token by default, except signup,
login, and the tablet-facing pairing endpoints (`POST /api/pairing/code`, `POST /api/pairing/poll`),
which are anonymous by necessity. `Services/CurrentUser.cs` is the single seam the authenticated
user is resolved into — see [`CLAUDE.md`](./CLAUDE.md). Tokens are opaque, 256-bit, non-expiring,
and revocation-based (see `Services/SessionService.cs`); there is no JWT and no ASP.NET Identity.

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

The default HTTP launch profile binds `http://0.0.0.0:5137`, so clients on your LAN can use your
computer's address. A local Android emulator can use `http://10.0.2.2:5137`; a phone or tablet
needs the computer's LAN address. Allow port 5137 through your firewall as needed. Use these
development defaults on a trusted network.

In Development, browse `http://localhost:5137/scalar/v1` for the interactive API reference or
`http://localhost:5137/openapi/v1.json` for OpenAPI. Neither endpoint is mapped in Production.
[`HabitTracker.Api.http`](src/HabitTracker.Api/HabitTracker.Api.http) contains sample requests;
set its token variable after signing in before running protected requests.

### Configuration and database lifecycle

The checked-in development connection string matches [`docker-compose.yml`](docker-compose.yml):
PostgreSQL 17 on port 5432, database/user/password all `habittracker`. Override it for another
database with the `ConnectionStrings__HabitTracker` environment variable. These credentials are
for local development. `ASPNETCORE_URLS` controls bindings when running without a launch profile
(for example, `dotnet run --no-launch-profile --project src/HabitTracker.Api`).

`pnpm db:down` stops the local database container and retains its named volume. `pnpm db:clear`
**drops the database and reapplies migrations**, removing accounts, sessions, invites, habits,
and entries. Migrations are explicit: starting the API does not apply them.

### Accounts and first sync

Create the first account while a new server is still reachable only by you. It needs no invite
and becomes the administrator. In mobile, save the server URL, create an account, then tap
**Sync now**. The API seeds no habits; clients can upload their local roster after authentication.

For API access, send `POST /api/auth/signup` (or `/api/auth/login` for an existing account) with:

```json
{
    "email": "you@example.com",
    "password": "<at-least-10-characters>",
    "deviceName": "API client"
}
```

Use the returned `token` as `Authorization: Bearer <token>` on protected endpoints. Subsequent
signups also need `inviteCode`: an administrator creates one with authenticated
`POST /api/invites`. Invites are single-use and expire after seven days.

The tablet pairs with an existing account through mobile's **Linked devices** page; it does not
create an account. Both clients must point to this same server. An anonymous `GET /api/habits`
returning `401` is expected and confirms the authentication gate, not a sync failure.

### Backups and recovery

Back up PostgreSQL before migrations or resets. Sync is not a database backup: clients do not
hold accounts, sessions, or invites, and may hold only some months of history. The tablet syncs
the viewed month; mobile sends locally changed months plus the viewed month. Neither automatically
downloads the server's entire history. After restoring a database, verify accounts and history
before reconnecting clients; do not assume a normal incremental sync can reconstruct a lost database.

For production, use a separate database and connection string, create the first account before
exposing signup publicly, apply migrations explicitly, and serve the API through HTTPS. Set
`ASPNETCORE_ENVIRONMENT=Production`. Enable `Network__TrustProxyHeaders=true` only when a trusted
reverse proxy is the only path to the API; this setting trusts incoming forwarded headers.

### The OpenAPI document

`pnpm build` (`dotnet build`) also writes the document to [`openapi.json`](./openapi.json) in this
directory — that is the `Microsoft.Extensions.ApiDescription.Server` package plus the
`OpenApiDocumentsDirectory` / `OpenApiGenerateDocumentsOptions` properties in
`HabitTracker.Api.csproj`. The file is **committed**, so a client can generate its API layer with
neither a running server nor a database: mobile runs [kubb](https://kubb.dev) over this exact file
(`apps/mobile/kubb.config.ts`) to produce `apps/mobile/src/api/gen/`.

Rebuild and commit it in the same change as any edit to `Dtos/` or a controller signature. A stale
`openapi.json` hands every client the old contract without any error to notice.

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

> **`AddAuthentication` is destructive, on purpose.** It deletes the stub user that
> `InitialCreate` seeded — and `Habit.UserId` cascades, as does `Entry.HabitId` — so applying it to
> a database that predates auth drops **every habit and entry** in it. That is intended: those rows
> belong to an identity that no longer exists, and there is no honest way to guess which real
> account should inherit them. Take a `pg_dump` first if a pre-auth deployment holds anything worth
> keeping. A client can upload the history it still holds, but a single sync may cover only some
> months. See [Backups and recovery](#backups-and-recovery).

## API

`/api/habits` — list / get / create / update / delete habits for the current user.
Enums serialize as strings (`"Positive"`, `"Success"`). Delete is a **soft-delete** (tombstone), so a
removed habit stops appearing but can still lose/win a sync merge.

`/api/sync` (POST) — one round-trip offline-first sync. The client submits its roster +
the month(s) it holds — alive rows and `deleted` tombstones, each carrying an `editedAt` (epoch
milliseconds UTC); the server merges per row **last-write-wins** by that edit-time and returns the
authoritative **alive** state to overwrite local with. Edit-time is stored verbatim as the merge
key, distinct from the server-stamped `UpdatedAt` audit field, which never reaches a client.
`Entry` `(HabitId, Date)`-keyed with `Outcome {Success, Failure}` is now exposed through sync. See
`HabitTracker.Api.http` for a sample.

A request whose newest `editedAt` runs more than five minutes ahead of the server clock is rejected
with `400` and merges nothing: an edit-time from a badly wrong clock would out-rank every later edit
until wall-clock caught up. Smaller drift merges normally and is logged as a warning.

### Auth

`/api/auth/signup` (POST, anonymous) — email + password + device name (+ invite code, required
once the `Users` table is non-empty). Returns the new user and a bearer token — signup logs you in.
The first user ever created needs no invite and becomes an admin.

`/api/auth/login` (POST, anonymous) — email + password + device name → user + bearer token. A
wrong email and a wrong password both answer the same generic `401`, so a caller can't enumerate
registered emails.

`/api/auth/logout` (POST) — deletes the calling session (the one the request authenticated with).

`/api/sessions` (GET) — the calling user's sessions, i.e. its linked devices. `DELETE
/api/sessions/{id}` — revokes one of the caller's own sessions; `404` for anyone else's.

`/api/invites` (POST, admin only) — mints a 7-day single-use invite code, returned once.

`/api/pairing` — the reMarkable's device-code pairing flow: `POST /code` (anonymous) issues a
6-character code the tablet displays and polls with `POST /poll` (anonymous) every few seconds. The
phone looks the code up with `GET /{code}` (authenticated) to see the requesting device's name, then
`POST /approve` (authenticated) to bind it to its account. The tablet's next poll after approval
returns a bearer token — the only time that token exists on the wire for this flow — and the code is
deleted in that same request, so a second poll on the same code reports it expired.

Every endpoint above except the four marked anonymous requires `Authorization: Bearer <token>`; a
missing or unknown token gets `401`. See [`CLAUDE.md`](./CLAUDE.md) for the auth layer's shape.

Every server-side rejection uses `application/problem+json`. Its `title` is safe to show to a user
and is the canonical explanation clients should display; clients only invent messages for failures
on their side of the HTTP seam, such as an unreachable server, a timeout, or an unreadable response.
Unexpected exceptions keep their details in server logs and return the same safe shape with a
generic title.
