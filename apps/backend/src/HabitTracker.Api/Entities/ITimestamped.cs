namespace HabitTracker.Api.Entities;

/// <summary>
/// Entities whose CreatedAt/UpdatedAt are stamped automatically on save.
/// These timestamps double as the future delta-sync cursor.
/// </summary>
public interface ITimestamped
{
    DateTimeOffset CreatedAt { get; set; }
    DateTimeOffset UpdatedAt { get; set; }
}
