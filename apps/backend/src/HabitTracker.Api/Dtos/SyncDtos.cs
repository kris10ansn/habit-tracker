using HabitTracker.Api.Entities;

namespace HabitTracker.Api.Dtos;

// Sync wire format. `EditedAt` is epoch milliseconds UTC — the client stamps Date.now() and the
// server stores that verbatim as the row's edit-time merge key. It is deliberately NOT the
// entities' server-stamped `UpdatedAt` audit field, which never reaches a client. A `Deleted` item
// is a tombstone whose `EditedAt` is the delete-time; its payload fields are then ignored.
// Requests carry alive rows + tombstones; responses carry the authoritative ALIVE state only.

public record SyncHabit(
    Guid Id,
    string Name,
    Polarity Polarity,
    int Position,
    long EditedAt,
    bool Deleted
);

public record SyncEntry(Guid HabitId, DateOnly Date, Outcome Outcome, long EditedAt, bool Deleted);

public record SyncMonth(string Month, IReadOnlyList<SyncEntry> Entries);

public record SyncRequest(IReadOnlyList<SyncHabit> Habits, IReadOnlyList<SyncMonth> Months);

public record SyncResponse(IReadOnlyList<SyncHabit> Habits, IReadOnlyList<SyncMonth> Months);
