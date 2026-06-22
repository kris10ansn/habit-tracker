namespace HabitTracker.Api.Entities;

/// <summary>
/// Whether a habit is something to do (Positive) or to avoid (Negative).
/// A first-class enum, not a bare bool — see the shared glossary.
/// </summary>
public enum Polarity
{
    Positive,
    Negative,
}
