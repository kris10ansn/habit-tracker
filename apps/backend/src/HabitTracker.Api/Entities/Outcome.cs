namespace HabitTracker.Api.Entities;

/// <summary>
/// An entry's recorded result, independent of polarity: the backend's canonical
/// form of the clients' X/O marks (X -> Success, O -> Failure for both polarities).
/// Absence of an entry is the Unmarked/default state. See apps/backend/CONTEXT.md.
/// </summary>
public enum Outcome
{
    Success,
    Failure,
}
