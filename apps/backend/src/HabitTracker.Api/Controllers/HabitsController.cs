using HabitTracker.Api.Dtos;
using HabitTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace HabitTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HabitsController : ControllerBase
{
    private readonly HabitService _habits;

    public HabitsController(HabitService habits) => _habits = habits;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<HabitResponse>>> GetHabits(
        CancellationToken cancellationToken
    ) => Ok(await _habits.GetHabitsAsync(cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<HabitResponse>> GetHabit(
        Guid id,
        CancellationToken cancellationToken
    )
    {
        var habit = await _habits.GetHabitAsync(id, cancellationToken);
        return habit is null ? NotFound() : Ok(habit);
    }

    [HttpPost]
    public async Task<ActionResult<HabitResponse>> CreateHabit(
        CreateHabitRequest request,
        CancellationToken cancellationToken
    )
    {
        var habit = await _habits.CreateHabitAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetHabit), new { id = habit.Id }, habit);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<HabitResponse>> UpdateHabit(
        Guid id,
        UpdateHabitRequest request,
        CancellationToken cancellationToken
    )
    {
        var habit = await _habits.UpdateHabitAsync(id, request, cancellationToken);
        return habit is null ? NotFound() : Ok(habit);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteHabit(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _habits.DeleteHabitAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
