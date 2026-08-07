namespace HabitTracker.Api.Entities;

/// <summary>
/// Entities whose CreatedAt/UpdatedAt are stamped on save when nobody supplied them.
/// <para>
/// The two are in different clock domains. <c>UpdatedAt</c> is always the server's — a pure audit
/// stamp that never reaches a client. <c>CreatedAt</c> belongs to whoever created the row: the
/// server for a REST-minted one, the creating client for a row that arrived over Sync, which
/// stores it verbatim. It is set once, at insert, and never moved by a later merge.
/// </para>
/// </summary>
public interface ITimestamped
{
    DateTimeOffset CreatedAt { get; set; }
    DateTimeOffset UpdatedAt { get; set; }
}
