const LABELS = {
    "saving": "Saving suspend image...",
    "saved": "Suspend image saved",
    "backing-up": "Backing up suspend image...",
    "backed-up": "Backed up suspend image",
    "restoring": "Restoring suspend image...",
    "restored": "Restored suspend image",
    "backup-failed": "Could not back up suspend image",
    "restore-failed": "Could not restore suspend image"
};

function text(phase, remainingSeconds) {
    if (phase === "pending") {
        return remainingSeconds > 0 ? `Saving suspend image in ${remainingSeconds}s` : "Saving suspend image...";
    }

    return LABELS[phase] || "";
}
