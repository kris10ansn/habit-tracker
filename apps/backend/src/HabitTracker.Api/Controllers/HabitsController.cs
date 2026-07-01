using HabitTracker.Api.Dtos;
using HabitTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace HabitTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HabitsController(HabitService _habits, ILogger<HabitsController> _logger) : ControllerBase
{

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<HabitResponse>>> GetHabits(
        CancellationToken cancellationToken
    )
    {
        var habits = await _habits.GetHabitsAsync(cancellationToken);
        _logger.LogInformation("Returned {HabitCount} habits", habits.Count);

        return Ok(habits);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<HabitResponse>> GetHabit(
        Guid id,
        CancellationToken cancellationToken
    )
    {
        var habit = await _habits.GetHabitAsync(id, cancellationToken);
        if (habit is null)
        {
            _logger.LogInformation("Habit {HabitId} not found", id);
            return NotFound();
        }

        return Ok(habit);
    }

    [HttpPost]
    public async Task<ActionResult<HabitResponse>> CreateHabit(
        CreateHabitRequest request,
        CancellationToken cancellationToken
    )
    {
        var habit = await _habits.CreateHabitAsync(request, cancellationToken);
        _logger.LogInformation("Created habit {HabitId}", habit.Id);

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
        if (habit is null)
        {
            _logger.LogInformation("Habit {HabitId} not found for update", id);
            return NotFound();
        }

        _logger.LogInformation("Updated habit {HabitId}", id);
        return Ok(habit);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteHabit(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _habits.DeleteHabitAsync(id, cancellationToken);
        if (!deleted)
        {
            _logger.LogInformation("Habit {HabitId} not found for delete", id);
            return NotFound();
        }

        _logger.LogInformation("Deleted habit {HabitId}", id);
        return NoContent();
    }

    [HttpGet("{id:guid}/entries")]
    public async Task<ActionResult<SyncResponse>> GetEntries(
        Guid id,
        CancellationToken cancellationToken
    )
    {
        var entries = await _habits.GetEntriesAsync(id, cancellationToken);
        if (entries is null)
        {
            _logger.LogInformation("Habit {HabitId} not found for entries", id);
            return NotFound();
        }

        _logger.LogInformation("Returned {EntryCount} entries for habit {HabitId}", entries.Count, id);
        return Ok(entries);
    }
}
