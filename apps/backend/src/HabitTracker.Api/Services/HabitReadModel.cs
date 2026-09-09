using HabitTracker.Api.Dtos;
using HabitTracker.Api.Entities;

namespace HabitTracker.Api.Services;

/// <summary>
/// The canonical alive-row representation shared by REST reads and Sync responses. Queries remain
/// owned by their services; this module only keeps wire projection and roster ordering identical.
/// </summary>
internal static class HabitReadModel
{
    internal static IOrderedQueryable<Habit> InRosterOrder(this IQueryable<Habit> habits) =>
        habits.OrderBy(h => h.Position).ThenBy(h => h.CreatedAt).ThenBy(h => h.Id);

    internal static HabitDto ToAliveDto(this Habit habit) =>
        new(
            habit.Id,
            habit.Name,
            habit.Polarity,
            habit.Position,
            habit.IsPrivate,
            habit.CreatedAt.ToUnixTimeMilliseconds(),
            habit.EditedAt.ToUnixTimeMilliseconds(),
            null
        );

    internal static EntryDto ToAliveDto(this Entry entry) =>
        new(
            entry.HabitId,
            entry.Date,
            entry.Outcome,
            entry.EditedAt.ToUnixTimeMilliseconds(),
            null
        );
}
