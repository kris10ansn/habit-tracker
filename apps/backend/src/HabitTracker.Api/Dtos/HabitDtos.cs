using HabitTracker.Api.Entities;

namespace HabitTracker.Api.Dtos;

public record HabitResponse(
    Guid Id,
    string Name,
    Polarity Polarity,
    int Position,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);


public record HabitEntryResponse(Entry Entry);

public record CreateHabitRequest(string Name, Polarity Polarity);

public record UpdateHabitRequest(string Name, Polarity Polarity, int Position);
