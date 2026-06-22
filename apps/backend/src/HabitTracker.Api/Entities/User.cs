namespace HabitTracker.Api.Entities;

/// <summary>
/// The account that owns a set of habits — the unit of ownership and (later)
/// authentication. Auth is not built yet; a stub identity stands in (see CurrentUser).
/// </summary>
public class User : ITimestamped
{
    public Guid Id { get; set; }

    public string? Name { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<Habit> Habits { get; set; } = new List<Habit>();
}
