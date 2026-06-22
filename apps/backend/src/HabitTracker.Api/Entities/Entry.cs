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

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
