namespace HabitTracker.Api.Services;

/// <summary>
/// The User on whose behalf the current request acts. Auth is deferred, so this
/// resolves to a single well-known stub identity for now (seeded in the DbContext).
/// When real authentication lands, this is the one seam to replace — register a
/// scoped implementation that reads the authenticated principal from the request.
/// </summary>
public sealed class CurrentUser
{
    public static readonly Guid StubUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    public Guid UserId { get; }

    public CurrentUser()
        : this(StubUserId) { }

    public CurrentUser(Guid userId) => UserId = userId;
}
