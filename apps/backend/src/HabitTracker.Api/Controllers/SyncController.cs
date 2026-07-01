using HabitTracker.Api.Dtos;
using HabitTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace HabitTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SyncController(SyncService _sync, ILogger<SyncController> _logger) : ControllerBase
{
    /// <summary>
    /// One round-trip sync for the current (stub) user: merge the submitted roster + month(s)
    /// last-write-wins, then return the authoritative alive state to overwrite local with.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SyncResponse>> Sync(
        SyncRequest request,
        CancellationToken cancellationToken
    )
    {
        _logger.LogInformation(
            "Sync received {HabitCount} habits across {MonthCount} months",
            request.Habits.Count,
            request.Months.Count
        );

        var response = await _sync.SyncAsync(request, cancellationToken);

        _logger.LogInformation(
            "Sync returned {HabitCount} habits across {MonthCount} months",
            response.Habits.Count,
            response.Months.Count
        );

        return Ok(response);
    }
}
