// Ambient sync-status line text (ADR 0003). Quiet by design: empty while standalone (no server
// configured), a brief phrase otherwise. Parallels SuspendStatus.js. Loud misconfig errors are a
// modal in Main, not this line.
function text(status, lastSyncedAt, hasServer, remainingSeconds) {
    if (!hasServer) return "";
    if (status === "pending") {
        return remainingSeconds > 0
            ? `Syncing in ${remainingSeconds}s`
            : "Syncing…";
    }

    if (status === "syncing") return "Syncing…";
    if (status === "offline") return "Sync failed";
    if (status === "error") return "Sync error";
    if (lastSyncedAt > 0) return "Synced to server";
    return "";
}
