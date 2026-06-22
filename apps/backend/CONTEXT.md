# Backend — Persistence & Sync Context

The C# / ASP.NET Core + EF Core service that will own the canonical Habit/Entry records and
(eventually) sync them to every client. The shared habit vocabulary (Habit, Polarity, Entry,
X/O marks, Unmarked, Default habits) lives in the [root glossary](../../CONTEXT.md); see
[CONTEXT-MAP.md](../../CONTEXT-MAP.md). This file covers only terms the backend adds or reframes.

## Language

**User**:
The account that owns a set of habits. The unit of ownership and (later) authentication. Every
Habit belongs to exactly one User. Auth is not built yet — a stub/seed identity stands in.
_Avoid_: account, profile, owner-as-a-separate-thing.

**Outcome**:
An entry's recorded result, **Success** or **Failure**, independent of polarity. The backend's
canonical form of the clients' X/O marks: X → Success, O → Failure for both polarities. Absence
of an entry is the Unmarked/default state (clients interpret that absence per polarity — a
negative habit's implicit "stayed clean" is never a stored Success). The log is permissive: any
Outcome may be stored against any habit; "negative habits only record Failure" is a client
convention, not a backend rule.
_Avoid_: mark, x/o, state, status.

**Position**:
A habit's explicit sort order within its User's list. Shared user intent — a reorder is meant to
sync across devices — not per-client presentation (unlike grid orientation).
_Avoid_: index, rank, sortKey (an implementation detail of how Position is encoded).
