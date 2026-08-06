using HabitTracker.Api.Data;
using HabitTracker.Api.Dtos;
using HabitTracker.Api.Entities;
using HabitTracker.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace HabitTracker.Api.Tests;

public class SyncServiceTests
{
    private static HabitTrackerDbContext NewDb() => SyncTestContext.NewDb("sync");

    private static SyncService NewSync(HabitTrackerDbContext db) =>
        new(db, new CurrentUser(), NullLogger<SyncService>.Instance);

    private static readonly DateTimeOffset T0 = new(2026, 6, 1, 12, 0, 0, TimeSpan.Zero);

    private static long Ms(int secondsAfterT0) =>
        T0.AddSeconds(secondsAfterT0).ToUnixTimeMilliseconds();

    private static SyncHabit Habit(
        Guid id,
        string name,
        long editedAt,
        bool deleted = false,
        int position = 0,
        Polarity polarity = Polarity.Positive
    ) => new(id, name, polarity, position, editedAt, deleted);

    private static SyncEntry Entry(
        Guid habitId,
        DateOnly date,
        Outcome outcome,
        long editedAt,
        bool deleted = false
    ) => new(habitId, date, outcome, editedAt, deleted);

    private static SyncMonth Month(string month, params SyncEntry[] entries) => new(month, entries);

    private static SyncRequest Request(SyncHabit[] habits, params SyncMonth[] months) =>
        new(habits, months);

    [Fact]
    public async Task Sync_CreatesNewHabitAndEntry_FromClient()
    {
        using var db = NewDb();
        var sync = NewSync(db);
        var id = Guid.NewGuid();
        var date = new DateOnly(2026, 6, 3);

        var response = await sync.SyncAsync(
            Request(
                [Habit(id, "Read", Ms(0))],
                Month("2026-06", Entry(id, date, Outcome.Success, Ms(1)))
            )
        );

        Assert.Equal("Read", Assert.Single(response.Habits).Name);
        var entry = Assert.Single(Assert.Single(response.Months).Entries);
        Assert.Equal(Outcome.Success, entry.Outcome);
        Assert.Equal(date, entry.Date);
    }

    [Fact]
    public async Task Sync_NewerClientEditWins_OlderLoses()
    {
        using var db = NewDb();
        var sync = NewSync(db);
        var id = Guid.NewGuid();

        await sync.SyncAsync(Request([Habit(id, "Read", Ms(10))]));

        var older = await sync.SyncAsync(Request([Habit(id, "Stale", Ms(5))]));
        Assert.Equal("Read", Assert.Single(older.Habits).Name);

        var newer = await sync.SyncAsync(Request([Habit(id, "Read more", Ms(20))]));
        Assert.Equal("Read more", Assert.Single(newer.Habits).Name);
    }

    [Fact]
    public async Task Sync_Tombstone_DeletesHabit_AndOnlyNewerReAddResurrects()
    {
        using var db = NewDb();
        var sync = NewSync(db);
        var id = Guid.NewGuid();

        await sync.SyncAsync(Request([Habit(id, "Read", Ms(0))]));

        var deleted = await sync.SyncAsync(Request([Habit(id, "Read", Ms(10), deleted: true)]));
        Assert.Empty(deleted.Habits);

        // A stale alive edit older than the delete must not resurrect.
        var stale = await sync.SyncAsync(Request([Habit(id, "Read", Ms(5))]));
        Assert.Empty(stale.Habits);

        // A newer re-add does resurrect.
        var readded = await sync.SyncAsync(Request([Habit(id, "Read again", Ms(20))]));
        Assert.Equal("Read again", Assert.Single(readded.Habits).Name);
    }

    [Fact]
    public async Task Sync_ClearedEntryTombstone_RemovesEntryFromResponse()
    {
        using var db = NewDb();
        var sync = NewSync(db);
        var id = Guid.NewGuid();
        var date = new DateOnly(2026, 6, 4);

        await sync.SyncAsync(
            Request(
                [Habit(id, "Read", Ms(0))],
                Month("2026-06", Entry(id, date, Outcome.Success, Ms(1)))
            )
        );

        var cleared = await sync.SyncAsync(
            Request([], Month("2026-06", Entry(id, date, Outcome.Success, Ms(2), deleted: true)))
        );

        Assert.Empty(Assert.Single(cleared.Months).Entries);
    }

    [Fact]
    public async Task Sync_IgnoresEntriesForUnownedHabits_AndLeavesOtherUsersUntouched()
    {
        using var db = NewDb();
        var sync = NewSync(db);

        var otherUserId = Guid.NewGuid();
        db.Users.Add(new User { Id = otherUserId, Name = "Other" });
        var foreignHabitId = Guid.NewGuid();
        db.Habits.Add(
            new Habit
            {
                Id = foreignHabitId,
                UserId = otherUserId,
                Name = "Theirs",
                Polarity = Polarity.Positive,
                Position = 0,
                EditedAt = T0,
            }
        );
        await db.SaveChangesAsync();

        var date = new DateOnly(2026, 6, 5);
        var response = await sync.SyncAsync(
            Request([], Month("2026-06", Entry(foreignHabitId, date, Outcome.Failure, Ms(1))))
        );

        Assert.Empty(response.Habits);
        Assert.Empty(Assert.Single(response.Months).Entries);
        Assert.False(await db.Entries.AnyAsync(e => e.HabitId == foreignHabitId));
    }

    [Fact]
    public async Task Sync_ReturnsHabitsByPosition_AndScopesEntriesToRequestedMonth()
    {
        using var db = NewDb();
        var sync = NewSync(db);
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        var june = new DateOnly(2026, 6, 6);
        var may = new DateOnly(2026, 5, 6);

        await sync.SyncAsync(
            Request(
                [Habit(second, "Second", Ms(0), position: 1), Habit(first, "First", Ms(0), position: 0)],
                // A May entry is stored to prove the response filters by the requested month.
                Month(
                    "2026-06",
                    Entry(first, june, Outcome.Success, Ms(1)),
                    Entry(first, may, Outcome.Success, Ms(1))
                )
            )
        );

        var response = await sync.SyncAsync(Request([], Month("2026-06")));

        Assert.Equal(["First", "Second"], response.Habits.Select(h => h.Name));
        var entry = Assert.Single(Assert.Single(response.Months).Entries);
        Assert.Equal(june, entry.Date);
    }

    [Fact]
    public async Task Sync_MergesEditTimesWithinTheClockSkewTolerance()
    {
        // A client clock running a little fast is ordinary; its edit-time still merges verbatim.
        using var db = NewDb();
        var sync = NewSync(db);
        var id = Guid.NewGuid();
        var date = new DateOnly(2026, 6, 3);

        var slightlyAhead = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + 2_000;

        var response = await sync.SyncAsync(
            Request(
                [Habit(id, "Read", slightlyAhead)],
                Month("2026-06", Entry(id, date, Outcome.Success, slightlyAhead))
            )
        );

        Assert.Equal(slightlyAhead, Assert.Single(response.Habits).EditedAt);
        Assert.Equal(slightlyAhead, Assert.Single(Assert.Single(response.Months).Entries).EditedAt);
    }

    [Fact]
    public async Task Sync_RefusesAHabitEditTimeBeyondTheTolerance_AndStoresNothing()
    {
        // A wildly fast clock would out-rank every later edit until wall-clock caught up, so the
        // whole request is refused rather than half-merged.
        using var db = NewDb();
        var sync = NewSync(db);

        var skew = await Assert.ThrowsAsync<ClockSkewException>(
            () =>
                sync.SyncAsync(
                    Request([Habit(Guid.NewGuid(), "Read", SyncTestContext.FarAheadEditTime())])
                )
        );

        Assert.Equal(SyncService.ClockSkewTolerance, skew.Tolerance);
        Assert.True(skew.SkewMs > (long)SyncService.ClockSkewTolerance.TotalMilliseconds);
        Assert.Empty(db.Habits);
    }

    [Fact]
    public async Task Sync_RefusesASkewedEntryEditTime_EvenWhenTheRosterIsSound()
    {
        using var db = NewDb();
        var sync = NewSync(db);
        var id = Guid.NewGuid();
        var date = new DateOnly(2026, 6, 3);

        var skew = await Assert.ThrowsAsync<ClockSkewException>(
            () =>
                sync.SyncAsync(
                    Request(
                        [Habit(id, "Read", Ms(0))],
                        Month(
                            "2026-06",
                            Entry(
                                id,
                                date,
                                Outcome.Success,
                                SyncTestContext.FarAheadEditTime()
                            )
                        )
                    )
                )
        );

        Assert.Equal(SyncService.ClockSkewTolerance, skew.Tolerance);
        Assert.Empty(db.Habits);
        Assert.Empty(db.Entries);
    }
}
