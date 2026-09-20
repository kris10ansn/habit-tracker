const LABELS = {
    saving: "Saving power-state images...",
    "save-failed": "Could not save power-state images",
    saved: "Power-state images saved",
    "backing-up": "Backing up power-state images...",
    "backed-up": "Backed up power-state images",
    restoring: "Restoring power-state images...",
    restored: "Restored power-state images",
    "backup-failed": "Could not back up power-state images",
    "restore-failed": "Could not restore power-state images",
};

function text(phase, remainingSeconds, failedPath = "") {
    if (phase === "pending") {
        return remainingSeconds > 0
            ? `Saving power-state images in ${remainingSeconds}s`
            : "Saving power-state images...";
    }

    const label = LABELS[phase] || "";
    return label && failedPath ? `${label}: ${failedPath}` : label;
}
