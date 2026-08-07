namespace HabitTracker.Api.Dtos;

// The Sync envelope. The rows inside are the canonical `HabitDto`/`EntryDto` shapes from
// HabitDtos.cs — Sync adds the month partitioning and the request/response framing, nothing else.
//
// Requests carry alive rows AND tombstones (a row whose `DeletedAt` is non-null; its payload
// fields are then ignored by the merge). Responses carry the authoritative ALIVE state only, so
// every row in a response has `DeletedAt` null — a delete surfaces to the client as absence.

public record SyncMonth(string Month, IReadOnlyList<EntryDto> Entries);

public record SyncRequest(IReadOnlyList<HabitDto> Habits, IReadOnlyList<SyncMonth> Months)
{
    /// <summary>
    /// The newest edit-time anywhere in the request — roster rows and every month's entries alike,
    /// tombstones included. Returns <paramref name="fallback"/> for a request carrying no rows at
    /// all, so an empty Sync reads as "nothing newer than the fallback" rather than as a skew.
    /// </summary>
    public long LatestEditedAt(long fallback) =>
        Habits
            .Select(habit => habit.EditedAt)
            .Concat(Months.SelectMany(month => month.Entries).Select(entry => entry.EditedAt))
            .DefaultIfEmpty(fallback)
            .Max();
}

public record SyncResponse(IReadOnlyList<HabitDto> Habits, IReadOnlyList<SyncMonth> Months);
