using System.Text.Json.Serialization;

namespace HabitTracker.Api.Entities;

/// <summary>
/// An entry's recorded result, independent of polarity: the backend's canonical
/// form of the clients' X/O marks (X -> Success, O -> Failure for both polarities).
/// Absence of an entry is the Unmarked/default state. See apps/backend/CONTEXT.md.
/// </summary>
// See the note on Polarity: declaring the string encoding on the type is what puts
// `"Success"`/`"Failure"` in the OpenAPI document instead of a bare `integer`.
[JsonConverter(typeof(JsonStringEnumConverter<Outcome>))]
public enum Outcome
{
    Success,
    Failure,
}
