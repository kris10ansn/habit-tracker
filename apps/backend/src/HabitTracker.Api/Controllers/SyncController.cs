using HabitTracker.Api.Dtos;
using HabitTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace HabitTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SyncController : ControllerBase
{
    private readonly SyncService _sync;

    public SyncController(SyncService sync) => _sync = sync;

    /// <summary>
    /// One round-trip sync for the current (stub) user: merge the submitted roster + month(s)
    /// last-write-wins, then return the authoritative alive state to overwrite local with.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SyncResponse>> Sync(
        SyncRequest request,
        CancellationToken cancellationToken
    ) => Ok(await _sync.SyncAsync(request, cancellationToken));
}
