using HabitTracker.Api.Data;
using HabitTracker.Api.Dtos;
using HabitTracker.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Api.Services;

/// <summary>
/// Habit CRUD scoped to the current user. Talks to the DbContext directly — at this
/// size DbContext is already a Unit-of-Work + repository, so no extra abstraction
/// (see ADR 0002).
/// </summary>
public class HabitService
{
    private readonly HabitTrackerDbContext _db;
    private readonly CurrentUser _currentUser;

    public HabitService(HabitTrackerDbContext db, CurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<HabitResponse>> GetHabitsAsync(
        CancellationToken cancellationToken = default
    )
    {
        return await OwnedHabits()
            .OrderBy(h => h.Position)
            .Select(h => new HabitResponse(
                h.Id,
                h.Name,
                h.Polarity,
                h.Position,
                h.CreatedAt,
                h.UpdatedAt
            ))
            .ToListAsync(cancellationToken);
    }

    public async Task<HabitResponse?> GetHabitAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var habit = await FindOwnedAsync(id, cancellationToken);
        return habit is null ? null : ToResponse(habit);
    }

    public async Task<HabitResponse> CreateHabitAsync(
        CreateHabitRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var maxPosition = await OwnedHabits()
            .Select(h => (int?)h.Position)
            .MaxAsync(cancellationToken);

        var habit = new Habit
        {
            Id = Guid.NewGuid(),
            UserId = _currentUser.UserId,
            Name = request.Name,
            Polarity = request.Polarity,
            Position = (maxPosition ?? -1) + 1,
        };

        _db.Habits.Add(habit);
        await _db.SaveChangesAsync(cancellationToken);

        return ToResponse(habit);
    }

    public async Task<HabitResponse?> UpdateHabitAsync(
        Guid id,
        UpdateHabitRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var habit = await FindOwnedAsync(id, cancellationToken);
        if (habit is null)
        {
            return null;
        }

        habit.Name = request.Name;
        habit.Polarity = request.Polarity;
        habit.Position = request.Position;
        await _db.SaveChangesAsync(cancellationToken);

        return ToResponse(habit);
    }

    public async Task<bool> DeleteHabitAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var habit = await FindOwnedAsync(id, cancellationToken);
        if (habit is null)
        {
            return false;
        }

        _db.Habits.Remove(habit);
        await _db.SaveChangesAsync(cancellationToken);

        return true;
    }

    private IQueryable<Habit> OwnedHabits() =>
        _db.Habits.Where(h => h.UserId == _currentUser.UserId);

    private Task<Habit?> FindOwnedAsync(Guid id, CancellationToken cancellationToken) =>
        OwnedHabits().FirstOrDefaultAsync(h => h.Id == id, cancellationToken);

    private static HabitResponse ToResponse(Habit h) =>
        new(h.Id, h.Name, h.Polarity, h.Position, h.CreatedAt, h.UpdatedAt);
}
