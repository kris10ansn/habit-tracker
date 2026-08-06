using HabitTracker.Api.Data;
using HabitTracker.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Api.Tests;

/// <summary>
/// Fixtures shared by the Sync suites: a throwaway database per test, and the one edit-time both
/// need — far enough ahead of the server clock that <see cref="SyncService"/> refuses the request.
/// </summary>
internal static class SyncTestContext
{
    /// <summary>
    /// A fresh in-memory database. <paramref name="suiteName"/> only labels it; the appended guid
    /// is what keeps two tests from sharing state.
    /// </summary>
    internal static HabitTrackerDbContext NewDb(string suiteName)
    {
        var options = new DbContextOptionsBuilder<HabitTrackerDbContext>()
            .UseInMemoryDatabase($"{suiteName}-{Guid.NewGuid()}")
            .Options;

        var db = new HabitTrackerDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    /// <summary>A minute past the tolerance — far enough ahead that the server refuses it.</summary>
    internal static long FarAheadEditTime() =>
        DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        + (long)SyncService.ClockSkewTolerance.TotalMilliseconds
        + 60_000;
}
