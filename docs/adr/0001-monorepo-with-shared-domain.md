# Monorepo with a shared habit domain

We restructured the single reMarkable project into a pnpm monorepo (`apps/remarkable`,
`apps/mobile`) so a second client (an expo mobile app) and an eventual shared backend can live
beside the original without forking the habit vocabulary. The Habit / Entry / X-O / polarity
language is now a root [`CONTEXT.md`](../../CONTEXT.md) glossary shared by every context, with
device-only terms (suspend image, settings, edit mode) demoted into `apps/remarkable/CONTEXT.md`;
[`CONTEXT-MAP.md`](../../CONTEXT-MAP.md) maps them. This was a deliberate trade-off — see below.

## Considered options

- **Split the shared glossary now (chosen).** Pins the ubiquitous language before the mobile client
  can drift into synonyms ("task", "check", "log"). Costs some up-front doc churn.
- **Move the project wholesale, split later.** Less churn now, but the second client would likely
  invent its own names before a shared glossary existed — exactly the drift we're avoiding.

- **Scaffold a `packages/shared` for the types now.** Rejected: the only JS consumer today is mobile
  (reMarkable is QML and can't import TypeScript), so a shared package would have a single consumer
  until the backend lands. We defer `packages/` until real code sharing appears.

## Consequences

- `apps/remarkable` stays a Make/QML project; it's a pnpm workspace member only via a thin
  `package.json` whose scripts shell out to `make`. The hard "never SSH to the device" rule is
  unchanged and now restated at the monorepo-root `CLAUDE.md`.
- The root `.npmrc` sets `node-linker=hoisted` because Metro (expo's bundler) doesn't follow pnpm's
  symlinked `node_modules`.
- Per-app domain decisions (e.g. opt-in suspend-image writing) stay in that app's `docs/adr/`; this
  root `docs/adr/` holds only system-wide decisions.
