# 6. Storage migrations are external, one-shot scripts

Status: accepted

Supersedes the read-tolerance consequence of [ADR 0005](0005-backend-shaped-entry-rows.md), and
promotes what [ADR 0002](0002-month-partitioned-habit-storage.md) recorded as a rejected option into
a rule of its own.

## Context

ADR 0002 already decided this: in-app migration from the legacy `habits.json` was "rejected in
favour of an **external** Node script the user runs off-device. The app carries no migration code;
it only ever speaks the new layout." But that decision lived in a _rejected options_ list, inside an
ADR about file partitioning. It had no addressable home.

So when ADR 0005 reshaped the stored rows, it reversed the policy in a Consequences bullet —
"Reads tolerate both formats, unlike ADR 0002's external-script-only migration stance" — and added
`Entries.rowsFromLegacyMonth` and `Polarity.fromHabit`. The local reasoning was sound: a legacy month
file read as empty would be overwritten by the next toggle, which is real data loss. But the policy
was overridden without being weighed, because nothing pointed at it.

The cost of tolerance is not the one converter. It is that every future shape change adds another
branch, each one impossible to delete with confidence — you cannot prove no device still holds the
old shape — so they accumulate permanently in the code every reader must understand. For an app with
one user and one device, that is a lot of permanent weight for a one-time event.

The missing piece was never the converter. It was a way to fail safely without one.

## Decision

**The app speaks exactly one on-disk shape.** No read-time tolerance for an old format, no
conversion-on-load, no version-bump branch.

- **A format change ships a one-shot script** in `scripts/`, run off-device against a `make backup`
  copy, and deleted once the device is migrated. Git history keeps it.
- **A file the app cannot read is refused, not converted.** `JsonStore.isUnwritable` blocks writes to
  it, `HabitsStore.hasUnreadableData` blocks sync, and the grid says which file and why. This is what
  makes the rule safe: the failure mode of a forgotten or mis-ordered migration is a loud refusal,
  never a silent overwrite. Refusal covers unparseable files too, which the previous corrupt-file
  handling let the next toggle clobber.
- **Scope is habit data** — `roster.json` and the month files. `sync.json` and `settings.json` hold
  no user data (a last-sync time, preferences), so they are rewritten rather than guarded.

This governs this client only. It is a consequence of one device and one user, not a repo-wide rule.

## Considered options

- **Read-time tolerance** (ADR 0005's position) — rejected on the accumulation argument above. It
  also hides the event: a converted file is silently rewritten on the next save, so a format change
  leaves no moment where anyone confirms the data survived intact.
- **A `version` field in every file**, refusing anything that isn't the current version — rejected:
  it adds a field to the month file, whose field names are the backend's `SyncMonth` payload
  (ADR 0005), and the structural refusal already catches the same case without touching the wire
  shape.
- **A migration step on launch** — rejected: it is a blocking rewrite of every month file on the
  UI thread of a 1 GHz device, at exactly the moment [ADR 0004](0004-view-other-months.md) works to
  keep responsive, for something that happens once.
- **Keeping migration scripts after use** — rejected: dead code the moment the device is migrated,
  and a growing directory of scripts that no longer have valid input to run against.

## Consequences

- An upgrade that changes the format is a manual sequence — close the app, `make backup`, run the
  script, check the reported counts, rsync the output back, `make deploy` — documented in the README.
  Old build on new data is as broken as new build on old data, so the app stays closed throughout.
- Getting that order wrong costs a modal, not data.
- Every load path in the app reads as one shape, with no branch explaining a format nobody runs any
  more.
- Migration correctness is established off-device, where a mistake costs nothing and can be checked
  against a backup: the script re-reads what it wrote and compares habit and entry counts before
  reporting success.
- Entries belonging to habits that no longer exist are dropped by the migration rather than carried,
  matching what `HabitsModel.toMonthEntryRows` writes on every save (ADR 0002's orphan handling).
