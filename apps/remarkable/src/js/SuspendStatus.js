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

function text(phase, remainingSeconds, failedPath = "", imageProgress = null) {
    if (phase === "saving" && imageProgress) {
        const pathParts = imageProgress.path.split("/");
        const filename = pathParts[pathParts.length - 1];
        const image =
            filename === "splash.bmp"
                ? pathParts.slice(-2).join("/")
                : filename;
        // The footer is right-aligned: keep the fixed label and count after the variable path.
        return `${image} — Saving (${imageProgress.remainingImages} left)`;
    }

    if (phase === "pending") {
        return remainingSeconds > 0
            ? `Saving power-state images in ${remainingSeconds}s`
            : "Saving power-state images...";
    }

    const label = LABELS[phase] || "";
    return label && failedPath ? `${label}: ${failedPath}` : label;
}
