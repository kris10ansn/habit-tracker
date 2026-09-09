# Contributing

Issues and pull requests are welcome. Small fixes can go straight to a pull request; please open an issue before a large feature or architectural change so the intended behavior and scope can be agreed first.

## Start here

Install the workspace dependencies from the repository root:

```sh
pnpm install
```

Then read the guide for the part you intend to change:

- [`apps/remarkable/README.md`](apps/remarkable/README.md)
- [`apps/mobile/README.md`](apps/mobile/README.md)
- [`apps/backend/README.md`](apps/backend/README.md)

Shared Habit and Entry terminology is defined in [`CONTEXT.md`](CONTEXT.md). Each application adds its own platform-specific context and development guidance.

## Project boundaries

- The backend is the only cross-client contract and owns sync reconciliation.
- Mobile and reMarkable are peer clients. Neither client's storage or UI model specifies the other.
- Keep each client useful offline; network availability must not gate daily tracking.
- Preserve platform intent: native mobile UI and high-contrast, low-refresh QML for the grayscale e-ink client.
- Storage and wire-format changes must include the migration, generated artifact, and documentation work required by that application.

## Checks

Run the checks for every application you touched:

```sh
pnpm lint
pnpm typecheck
pnpm backend:test
pnpm remarkable:test
```

If reMarkable drawing logic or its stored data shape changes, also run:

```sh
cd apps/remarkable
make suspend-writer-test
```

The application-specific guides describe additional prerequisites and targeted commands.

## Generated files

- Backend API shape changes must include a rebuilt `apps/backend/openapi.json`.
- Mobile's `src/api/gen/` is generated from that OpenAPI document; do not edit it by hand.
- Mobile database schema changes must include regenerated Drizzle migrations.
- Committed README images are maintained separately from runtime assets. The intended regeneration workflow is documented in [`docs/readme-screenshot-plan.md`](docs/readme-screenshot-plan.md).

## Pull requests

- Keep a pull request focused on one coherent change.
- Explain the user-visible behavior and any compatibility or migration consequences.
- Include tests for behavior that can be exercised off-device.
- For visual changes, include before/after images or describe the device/emulator checks performed.
- Update the relevant README, context document, or ADR when behavior or architectural intent changes.

By contributing, you agree that your contribution is licensed under the repository's AGPL-3.0-or-later license.
