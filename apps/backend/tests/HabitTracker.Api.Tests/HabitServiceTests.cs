using HabitTracker.Api.Data;
using HabitTracker.Api.Dtos;
using HabitTracker.Api.Entities;
using HabitTracker.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Api.Tests;

public class HabitServiceTests
{
    // A fresh in-memory store per test, with the stub user seeded (via HasData).
    private static HabitTrackerDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<HabitTrackerDbContext>()
            .UseInMemoryDatabase($"habits-{Guid.NewGuid()}")
            .Options;

        var db = new HabitTrackerDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    [Fact]
    public async Task CreateHabit_AssignsSequentialPositions_AndStampsTimestamps()
    {
        using var db = NewDb();
        var service = new HabitService(db, new CurrentUser());

        var first = await service.CreateHabitAsync(new CreateHabitRequest("Read", Polarity.Positive));
        var second = await service.CreateHabitAsync(
            new CreateHabitRequest("Smoke", Polarity.Negative)
        );

        Assert.Equal(0, first.Position);
        Assert.Equal(1, second.Position);
        Assert.NotEqual(default, first.CreatedAt);
        Assert.Equal(first.CreatedAt, first.UpdatedAt);
    }

    [Fact]
    public async Task GetHabits_ReturnsOnlyCurrentUsersHabits_OrderedByPosition()
    {
        using var db = NewDb();
        var service = new HabitService(db, new CurrentUser());
        await service.CreateHabitAsync(new CreateHabitRequest("Read", Polarity.Positive));

        // A habit owned by a different user must not leak through.
        var otherUserId = Guid.NewGuid();
        db.Users.Add(new User { Id = otherUserId, Name = "Other" });
        db.Habits.Add(
            new Habit
            {
                Id = Guid.NewGuid(),
                UserId = otherUserId,
                Name = "Theirs",
                Polarity = Polarity.Positive,
                Position = 0,
            }
        );
        await db.SaveChangesAsync();

        var habits = await service.GetHabitsAsync();

        Assert.Single(habits);
        Assert.Equal("Read", habits[0].Name);
    }

    [Fact]
    public async Task UpdateHabit_ChangesFields_ForOwnedHabit()
    {
        using var db = NewDb();
        var service = new HabitService(db, new CurrentUser());
        var created = await service.CreateHabitAsync(
            new CreateHabitRequest("Read", Polarity.Positive)
        );

        var updated = await service.UpdateHabitAsync(
            created.Id,
            new UpdateHabitRequest("Read more", Polarity.Negative, 3)
        );

        Assert.NotNull(updated);
        Assert.Equal("Read more", updated!.Name);
        Assert.Equal(Polarity.Negative, updated.Polarity);
        Assert.Equal(3, updated.Position);
    }

    [Fact]
    public async Task UpdateHabit_ReturnsNull_ForUnknownId()
    {
        using var db = NewDb();
        var service = new HabitService(db, new CurrentUser());

        var updated = await service.UpdateHabitAsync(
            Guid.NewGuid(),
            new UpdateHabitRequest("Nope", Polarity.Positive, 0)
        );

        Assert.Null(updated);
    }

    [Fact]
    public async Task DeleteHabit_RemovesOwnedHabit_AndReportsMissing()
    {
        using var db = NewDb();
        var service = new HabitService(db, new CurrentUser());
        var created = await service.CreateHabitAsync(
            new CreateHabitRequest("Read", Polarity.Positive)
        );

        Assert.True(await service.DeleteHabitAsync(created.Id));
        Assert.False(await service.DeleteHabitAsync(Guid.NewGuid()));
        Assert.Empty(await service.GetHabitsAsync());
    }
}
