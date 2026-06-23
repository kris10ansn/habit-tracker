using System.Globalization;
using HabitTracker.Api.Data;
using HabitTracker.Api.Dtos;
using HabitTracker.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Api.Services;

/// <summary>
/// State-based, last-write-wins sync for the current user (ADR 0003). The client submits its
/// roster plus the month(s) it holds — alive rows and tombstones, each carrying a UTC edit-time —
/// and the server merges per row by edit-time, then returns the authoritative ALIVE state for the
/// client to overwrite local with. Tombstones live durably here, never in the response.
/// </summary>
public class SyncService
{
    private readonly HabitTrackerDbContext _db;
    private readonly CurrentUser _currentUser;

    public SyncService(HabitTrackerDbContext db, CurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<SyncResponse> SyncAsync(
        SyncRequest request,
        CancellationToken cancellationToken = default
    )
    {
        await MergeHabitsAsync(request.Habits, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        await MergeEntriesAsync(request.Months, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        return await BuildResponseAsync(request.Months, cancellationToken);
    }

    private async Task MergeHabitsAsync(
        IReadOnlyList<SyncHabit> incoming,
        CancellationToken cancellationToken
    )
    {
        var existing = await _db
            .Habits.Where(h => h.UserId == _currentUser.UserId)
            .ToDictionaryAsync(h => h.Id, cancellationToken);

        foreach (var dto in incoming)
        {
            var editedAt = FromUnixMs(dto.UpdatedAt);

            if (!existing.TryGetValue(dto.Id, out var habit))
            {
                _db.Habits.Add(
                    new Habit
                    {
                        Id = dto.Id,
                        UserId = _currentUser.UserId,
                        Name = dto.Name,
                        Polarity = dto.Polarity,
                        Position = dto.Position,
                        EditedAt = editedAt,
                        DeletedAt = dto.Deleted ? editedAt : null,
                    }
                );
                continue;
            }

            if (editedAt <= habit.EditedAt)
            {
                continue; // stored row is newer-or-equal — it wins
            }

            habit.EditedAt = editedAt;
            habit.DeletedAt = dto.Deleted ? editedAt : null;

            if (!dto.Deleted)
            {
                habit.Name = dto.Name;
                habit.Polarity = dto.Polarity;
                habit.Position = dto.Position;
            }
        }
    }

    private async Task MergeEntriesAsync(
        IReadOnlyList<SyncMonth> months,
        CancellationToken cancellationToken
    )
    {
        var ownedHabitIds = (
            await _db
                .Habits.Where(h => h.UserId == _currentUser.UserId)
                .Select(h => h.Id)
                .ToListAsync(cancellationToken)
        ).ToHashSet();

        var incoming = months
            .SelectMany(m => m.Entries)
            .Where(e => ownedHabitIds.Contains(e.HabitId))
            .ToList();

        if (incoming.Count == 0)
        {
            return;
        }

        var habitIds = incoming.Select(e => e.HabitId).Distinct().ToList();
        var dates = incoming.Select(e => e.Date).Distinct().ToList();
        var existing = (
            await _db
                .Entries.Where(e => habitIds.Contains(e.HabitId) && dates.Contains(e.Date))
                .ToListAsync(cancellationToken)
        ).ToDictionary(e => (e.HabitId, e.Date));

        foreach (var dto in incoming)
        {
            var editedAt = FromUnixMs(dto.UpdatedAt);

            if (!existing.TryGetValue((dto.HabitId, dto.Date), out var entry))
            {
                _db.Entries.Add(
                    new Entry
                    {
                        HabitId = dto.HabitId,
                        Date = dto.Date,
                        Outcome = dto.Outcome,
                        EditedAt = editedAt,
                        DeletedAt = dto.Deleted ? editedAt : null,
                    }
                );
                continue;
            }

            if (editedAt <= entry.EditedAt)
            {
                continue;
            }

            entry.EditedAt = editedAt;
            entry.DeletedAt = dto.Deleted ? editedAt : null;

            if (!dto.Deleted)
            {
                entry.Outcome = dto.Outcome;
            }
        }
    }

    private async Task<SyncResponse> BuildResponseAsync(
        IReadOnlyList<SyncMonth> months,
        CancellationToken cancellationToken
    )
    {
        var habitEntities = await _db
            .Habits.Where(h => h.UserId == _currentUser.UserId && h.DeletedAt == null)
            .OrderBy(h => h.Position)
            .ToListAsync(cancellationToken);

        var habits = habitEntities
            .Select(h => new SyncHabit(
                h.Id,
                h.Name,
                h.Polarity,
                h.Position,
                ToUnixMs(h.EditedAt),
                false
            ))
            .ToList();

        var responseMonths = new List<SyncMonth>();
        foreach (var month in months)
        {
            var (start, end) = MonthRange(month.Month);

            var entryEntities = await _db
                .Entries.Where(e =>
                    e.Habit.UserId == _currentUser.UserId
                    && e.Habit.DeletedAt == null
                    && e.DeletedAt == null
                    && e.Date >= start
                    && e.Date < end
                )
                .ToListAsync(cancellationToken);

            var entries = entryEntities
                .Select(e => new SyncEntry(
                    e.HabitId,
                    e.Date,
                    e.Outcome,
                    ToUnixMs(e.EditedAt),
                    false
                ))
                .ToList();

            responseMonths.Add(new SyncMonth(month.Month, entries));
        }

        return new SyncResponse(habits, responseMonths);
    }

    private static (DateOnly start, DateOnly end) MonthRange(string month)
    {
        var start = DateOnly.ParseExact(month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture);
        return (start, start.AddMonths(1));
    }

    private static DateTimeOffset FromUnixMs(long ms) => DateTimeOffset.FromUnixTimeMilliseconds(ms);

    private static long ToUnixMs(DateTimeOffset value) => value.ToUnixTimeMilliseconds();
}
