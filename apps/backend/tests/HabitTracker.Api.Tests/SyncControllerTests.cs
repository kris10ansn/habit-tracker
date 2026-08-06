using HabitTracker.Api.Controllers;
using HabitTracker.Api.Data;
using HabitTracker.Api.Dtos;
using HabitTracker.Api.Entities;
using HabitTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace HabitTracker.Api.Tests;

public class SyncControllerTests
{
    private static HabitTrackerDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<HabitTrackerDbContext>()
            .UseInMemoryDatabase($"sync-controller-{Guid.NewGuid()}")
            .Options;

        var db = new HabitTrackerDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    private static SyncController NewController(HabitTrackerDbContext db) =>
        new(
            new SyncService(db, new CurrentUser(), NullLogger<SyncService>.Instance),
            NullLogger<SyncController>.Instance
        );

    private static SyncRequest OneHabitAt(long editedAt) =>
        new([new SyncHabit(Guid.NewGuid(), "Read", Polarity.Positive, 0, editedAt, false)], []);

    [Fact]
    public async Task Sync_ReturnsTheAuthoritativeState()
    {
        using var db = NewDb();
        var controller = NewController(db);

        var result = await controller.Sync(
            OneHabitAt(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()),
            CancellationToken.None
        );

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<SyncResponse>(ok.Value);
        Assert.Equal("Read", Assert.Single(response.Habits).Name);
    }

    [Fact]
    public async Task Sync_TurnsAnUnusableClientClockIntoABadRequest()
    {
        using var db = NewDb();
        var controller = NewController(db);

        var farAhead =
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            + (long)SyncService.ClockSkewTolerance.TotalMilliseconds
            + 60_000;

        var result = await controller.Sync(OneHabitAt(farAhead), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(400, problem.Status);
        Assert.Empty(db.Habits);
    }
}
