using HabitTracker.Api.Entities;

namespace HabitTracker.Api.Dtos;

// Sync wire format (ADR 0003). Timestamps are epoch milliseconds UTC — the client stamps
// Date.now() and the server stores that verbatim as the row's edit-time merge key. A `Deleted`
// item is a tombstone whose `UpdatedAt` is the delete-time; its payload fields are then ignored.
// Requests carry alive rows + tombstones; responses carry the authoritative ALIVE state only.

public record SyncHabit(
    Guid Id,
    string Name,
    Polarity Polarity,
    int Position,
    long UpdatedAt,
    bool Deleted
);

public record SyncEntry(Guid HabitId, DateOnly Date, Outcome Outcome, long UpdatedAt, bool Deleted);

public record SyncMonth(string Month, IReadOnlyList<SyncEntry> Entries);

public record SyncRequest(IReadOnlyList<SyncHabit> Habits, IReadOnlyList<SyncMonth> Months);

public record SyncResponse(IReadOnlyList<SyncHabit> Habits, IReadOnlyList<SyncMonth> Months);
