# Habit Tracker for reMarkable + Mobile

> An offline-first tracker that puts today's habits on your reMarkable sleep screen and optionally syncs them with your phone.

> [!WARNING]
> **AI-generated placeholder:** The image below is a visual concept, not a screenshot of the actual application. It will be replaced by captures from the real reMarkable and Android interfaces. See the [screenshot-generation plan](docs/readme-screenshot-plan.md).

<p align="center">
  <img src="docs/images/readme-hero-concept.png" alt="AI-generated placeholder showing the habit tracker concept on an e-ink tablet and Android phone" width="100%">
</p>

This repository contains three parts of one habit-tracking system:

- A **reMarkable 1 app** built for a grayscale, distraction-free daily workflow.
- A native **mobile companion** for logging, reviewing, and managing habits on the go.
- An optional **self-hosted sync service** that reconciles both clients without making either one dependent on a network connection.

Both clients remain useful on their own. Sync is something you opt into by supplying a server address.

## Why it is different

- **The sleep screen is useful.** The reMarkable can show today's habit grid while suspended, making the tracker visible before you even open the app.
- **Offline comes first.** reMarkable stores local JSON and mobile stores local SQLite; an unavailable server never stops daily tracking.
- **Good and bad habits read naturally.** Positive habits track what you want to do, while negative habits track what you want to avoid.
- **Private habits stay off the sleep screen.** A shared privacy flag keeps selected habits out of the reMarkable suspend image; its main-grid reveal setting remains local to that device.
- **Sync has a clear owner.** Clients exchange timestamped rows and tombstones; the backend performs the last-write-wins merge and returns the authoritative result.

## Linking the devices

The reMarkable requests a short pairing code. The signed-in mobile app identifies the requesting device before approval, then lets the account owner review or revoke every linked session.

> [!WARNING]
> **AI-generated placeholder:** This illustrates the intended sequence but does not show the application's actual pairing screens. The real capture set will include the pairing code, approval state, and linked-device list.

<p align="center">
  <img src="docs/images/device-linking-concept.png" alt="AI-generated placeholder illustrating a pairing code on reMarkable, approval on mobile, and the linked-device list" width="100%">
</p>

## How it fits together

```mermaid
flowchart LR
    RM[reMarkable 1<br/>QML + JSON] <-->|optional sync| API[ASP.NET Core API<br/>authentication + reconciliation]
    MOBILE[Android / iOS client<br/>Expo + SQLite] <-->|optional sync| API
    API --> DB[(PostgreSQL)]
```

| Part                                  | Role                                                                                      | Stack                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`apps/remarkable`](apps/remarkable/) | E-ink habit grid, editing, local persistence, pairing, and opt-in suspend-image rendering | QML, Qt 5.15, JavaScript, XOVI, rm-appload                             |
| [`apps/mobile`](apps/mobile/)         | Today view, streaks, month review, habit management, accounts, and linked devices         | Expo SDK 56, React Native, TypeScript, SQLite, Drizzle, TanStack Query |
| [`apps/backend`](apps/backend/)       | Authentication, pairing, canonical records, and sync reconciliation                       | ASP.NET Core 10, EF Core, PostgreSQL, OpenAPI                          |

The backend is the only cross-client contract. The two clients deliberately use storage and presentation models suited to their platforms instead of importing assumptions from one another.

## Features

### reMarkable

- Calendar grid with month navigation and today highlighting.
- Positive and negative habit semantics using simple X/O marks.
- Reorder, rename, delete, change polarity, mark private, and add habits on-device.
- Horizontal and vertical paging designed for the reMarkable 1 display.
- Optional suspend-image rendering with backup, restore, debounce, and content deduplication.
- Standalone local operation or authenticated pairing with a self-hosted sync server.

[Full reMarkable guide →](apps/remarkable/README.md)

### Mobile

- Focused Today view with progress, streaks, and slip tracking.
- Portrait month view with days as rows and habits as columns.
- Habit creation, editing, polarity changes, deletion, and drag reordering.
- Standalone mode, explicit server configuration, manual or pull-to-refresh sync, and visible sync state.
- Account signup/login, device-code approval, linked-session review, and revocation.

[Full mobile guide →](apps/mobile/README.md)

### Backend and sync

- Offline-first, one-round-trip sync with per-row edit timestamps and tombstones.
- Server-owned last-write-wins reconciliation for habits and entries.
- Opaque bearer sessions with explicit revocation rather than expiring JWTs.
- Short-lived, unambiguous pairing codes for devices without practical login forms.
- Committed OpenAPI contract used to generate and validate the mobile wire layer.

[Backend guide →](apps/backend/README.md)

## Platform status

| Target       | Status                                           |
| ------------ | ------------------------------------------------ |
| reMarkable 1 | Supported through XOVI + rm-appload              |
| Android      | Supported native client                          |
| iOS          | Build target present; not currently verified     |
| Web          | Not supported                                    |
| Sync service | Self-hosted                                      |
| Distribution | Source and internal builds; no app-store release |

## Getting started

Install the workspace dependencies once from the repository root:

```sh
pnpm install
```

### Run the mobile client

```sh
pnpm mobile:start
pnpm mobile:android
```

The mobile app can run without a backend. Add habits locally, or configure a server later from the Sync tab.

### Run the backend

The backend requires the .NET 10 SDK and Docker:

```sh
pnpm backend:db:up
pnpm backend:migrate
pnpm backend:start
```

The development API listens on `http://localhost:5137` by default.

### Install on reMarkable

The tablet client targets **reMarkable 1** and runs inside the stock UI through [XOVI](https://github.com/asivery/xovi) and [rm-appload](https://github.com/asivery/rm-appload). With that stack installed and Qt 5's resource compiler available:

```sh
cd apps/remarkable
make build
make deploy
```

Installation, SSH configuration, backups, migrations, and device-specific caveats are documented in the [reMarkable guide](apps/remarkable/README.md).

## Privacy and data ownership

- There is no telemetry.
- Both clients persist habits locally and continue working offline.
- Nothing is sent anywhere until a sync server is configured.
- The backend is self-hosted and keeps each account's records separate.
- Private habits are excluded from the reMarkable suspend image; the tablet's main-grid reveal setting stays local and never syncs.
- Session tokens can be revoked from the linked-device list without deleting local habit data.

## Engineering highlights

- The reMarkable UI is a pure-QML scene loaded into `xochitl`; it does not own the Qt process or rely on a normal desktop window system.
- A separate headless Qt tool reuses the app's production drawing logic to render suspend images without launching the QML UI.
- reMarkable partitions entries into one JSON file per month, while mobile stores the backend-shaped domain in SQLite through Drizzle.
- The backend emits a committed OpenAPI document, and the mobile API client and response validators are generated from it.
- Sync treats deletion as dated data. Tombstones and client-stamped edit times let offline changes reconcile without silently resurrecting removed records.
- Architecture decisions and domain language are recorded in [`CONTEXT.md`](CONTEXT.md), per-app context files, and the reMarkable client's ADRs.

## Repository layout

```text
.
├── apps/
│   ├── backend/      ASP.NET Core API and PostgreSQL persistence
│   ├── mobile/       Expo / React Native client
│   └── remarkable/   QML client and suspend-image renderer
├── docs/             Project-level plans and README assets
├── CONTEXT.md        Shared habit-domain vocabulary
└── package.json      Workspace commands
```

## Development checks

```sh
pnpm lint
pnpm typecheck
pnpm backend:test
pnpm remarkable:test
```

The reMarkable suspend renderer has an additional host smoke test:

```sh
cd apps/remarkable
make suspend-writer-test
```

## Contributing

Issues and pull requests are welcome. Start with [`CONTRIBUTING.md`](CONTRIBUTING.md) for the project boundaries, generated-code workflow, and checks expected before review.

## License

Habit Tracker is free software licensed under the [GNU Affero General Public License v3.0 or later](LICENSE). Third-party components remain under their respective licenses.
