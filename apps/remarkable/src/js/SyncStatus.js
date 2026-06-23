// Ambient sync-status line text (ADR 0003). Quiet by design: empty while standalone (no server
// configured), a brief phrase otherwise. Parallels SuspendStatus.js. Loud misconfig errors are a
// modal in Main, not this line.
function text(status, lastSyncedAt, hasServer) {
    if (!hasServer) return "";
    if (status === "syncing") return "Syncing…";
    if (status === "offline") return "Offline — will retry";
    if (status === "error") return "Sync error";
    if (lastSyncedAt > 0) return `Synced ${ago(lastSyncedAt)}`;
    return "";
}

const ago = (ms) => {
    const secs = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (secs < 60) return "just now";

    const mins = Math.round(secs / 60);
    if (mins < 60) return `${mins}m ago`;

    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;

    return `${Math.round(hours / 24)}d ago`;
};
