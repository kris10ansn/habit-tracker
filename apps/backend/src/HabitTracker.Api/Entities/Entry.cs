namespace HabitTracker.Api.Entities;

/// <summary>
/// One day's recorded result for a habit. Composite-keyed by (HabitId, Date) so there
/// is at most one entry per habit per day and writes are a clean upsert. The log is
/// permissive: any Outcome may be stored against any habit (see ADR 0001).
/// </summary>
public class Entry : ITimestamped
{
    public Guid HabitId { get; set; }
    public Habit Habit { get; set; } = null!;

    public DateOnly Date { get; set; }
    public Outcome Outcome { get; set; }

    /// <summary>
    /// The client's edit-time (UTC) for this entry's current state — the last-write-wins merge key
    /// for sync, stored verbatim and distinct from the server-stamped <see cref="UpdatedAt"/>. See
    /// ADR 0003.
    /// </summary>
    public DateTimeOffset EditedAt { get; set; }

    /// <summary>Tombstone: non-null once cleared/soft-deleted, holding the clear's edit-time.</summary>
    public DateTimeOffset? DeletedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
