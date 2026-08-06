namespace HabitTracker.Api.Services;

/// <summary>
/// A Sync submitted an edit-time further ahead of the server clock than
/// <see cref="SyncService.ClockSkewTolerance"/> allows. The controller turns this into a 400 —
/// the client's clock, not its data, is what needs fixing.
/// </summary>
public class ClockSkewException(long skewMs, TimeSpan tolerance)
    : Exception(
        $"A submitted edit-time is {skewMs}ms ahead of the server clock; "
            + $"at most {tolerance.TotalSeconds:F0}s of drift is accepted."
    )
{
    public long SkewMs { get; } = skewMs;

    public TimeSpan Tolerance { get; } = tolerance;
}
