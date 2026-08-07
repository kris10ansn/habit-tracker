using System.Text.Json.Serialization;

namespace HabitTracker.Api.Entities;

/// <summary>
/// Whether a habit is something to do (Positive) or to avoid (Negative).
/// A first-class enum, not a bare bool — see the shared glossary.
/// </summary>
// The member names are the wire format ("Positive"/"Negative") and both clients store that
// spelling verbatim. Program.cs already registers a global JsonStringEnumConverter, so this
// attribute changes no runtime behaviour — it declares the encoding on the type, where the OpenAPI
// schema generator can see it. Without it the generated document describes this as a bare
// `integer`, and every client generated from that document decodes the wrong thing.
[JsonConverter(typeof(JsonStringEnumConverter<Polarity>))]
public enum Polarity
{
    Positive,
    Negative,
}
