.import "Storage.js" as Storage
.import "BootSplash.js" as BootSplash

// Storage reports a write only once it has landed, so both of these answer through a callback
// rather than a return value. Reporting the copy synchronously is what let a failed suspend-image
// backup read as a success — and enabling the feature on that answer overwrites the stock image
// with no way back (ADR 0001).

function copyFile(srcPath, dstPath, onDone) {
    Storage.readBinaryAsync(srcPath, (buffer) => {
        if (!buffer) {
            console.warn("SuspendRender: could not read", srcPath);
            onDone(false);
            return;
        }
        Storage.writeBinary(dstPath, buffer, (error) => {
            if (error) console.warn("SuspendRender: could not write", dstPath);
            onDone(!error);
        });
    });
}

function readSignature(path) {
    const sig = Storage.readJson(path);
    return typeof sig === "string" ? sig : "";
}

function writeSignature(path, signature, onDone) {
    const report = (succeeded) => {
        if (typeof onDone === "function") {
            onDone(succeeded);
        }
    };

    try {
        Storage.writeJson(path, signature, (error) => report(!error));
    } catch (e) {
        console.warn("SuspendRender: could not write signature", path, "-", e);
        report(false);
    }
}

function imageTargets(directory) {
    return [
        { state: "sleep", filename: "suspended.png" },
        { state: "off", filename: "poweroff.png" },
        { state: "empty", filename: "batteryempty.png" },
        { state: "starting", filename: "starting.png", optional: true },
        { state: "rebooting", filename: "rebooting.png", optional: true },
        { state: "overheating", filename: "overheating.png", optional: true },
        // Some firmware links this file to rebooting.png. Both must render identical bytes.
        { state: "rebooting", filename: "restart-crashed.png", optional: true },
    ].map((target) =>
        Object.assign({}, target, {
            path: `${directory}/${target.filename}`,
            backup: `${directory}/${target.filename}.bak`,
        }),
    );
}

const isAvailable = (target, onDone) => {
    if (!target.optional) {
        onDone(true);
        return;
    }
    Storage.readBinaryAsync(target.path, (image) => {
        if (image) onDone(true);
        else
            Storage.readBinaryAsync(target.backup, (backup) =>
                onDone(backup !== null),
            );
    });
};

function availableImageTargets(targets, onDone) {
    const selected = [];
    const next = (index) => {
        if (index === targets.length) return onDone(selected);

        const target = targets[index];
        isAvailable(target, (available) => {
            if (available) selected.push(target);
            next(index + 1);
        });
    };
    next(0);
}

const validateBootTarget = (target, restoring, onDone) => {
    Storage.readBinaryAsync(target.backup, (backup) => {
        if (
            (restoring || backup !== null) &&
            BootSplash.validationError(backup)
        ) {
            onDone(target.backup);
            return;
        }
        if (restoring) {
            onDone("");
            return;
        }
        Storage.readBinaryAsync(target.path, (image) =>
            onDone(
                BootSplash.validationError(image || backup) ? target.path : "",
            ),
        );
    });
};

function invalidBootPath(targets, deviceModel, onDone, restoring = false) {
    const bootTargets = targets.filter(
        (target) => target.format === "boot-bmp",
    );
    if (bootTargets.length && deviceModel !== "reMarkable 1.0") {
        onDone(bootTargets[0].path);
        return;
    }
    const next = (index) => {
        if (index === bootTargets.length) return onDone("");
        validateBootTarget(bootTargets[index], restoring, (invalid) => {
            if (invalid) onDone(invalid);
            else next(index + 1);
        });
    };
    next(0);
}

const backupImage = (target, onDone) => {
    Storage.readBinaryAsync(target.backup, (existing) => {
        if (existing) onDone(true);
        else copyFile(target.path, target.backup, onDone);
    });
};

// Existing backups survive retries, upgrades from suspend-only writing, and re-enabling.
// Back up every target before any image is replaced.
function backupImages(targets, onDone, deviceModel) {
    const next = (index) => {
        if (index === targets.length) return onDone(true, "");

        const target = targets[index];
        backupImage(target, (ok) => {
            if (!ok) return onDone(false, target.path);
            next(index + 1);
        });
    };
    invalidBootPath(targets, deviceModel, (invalid) => {
        if (invalid) onDone(false, invalid);
        else next(0);
    });
}

function restoreImages(targets, onDone, deviceModel) {
    const restore = (index) => {
        if (index === targets.length) return onDone(true, "");

        const target = targets[index];
        copyFile(target.backup, target.path, (ok) => {
            if (!ok) return onDone(false, target.path);
            restore(index + 1);
        });
    };
    const preflight = (index) => {
        if (index === targets.length) return restore(0);

        const target = targets[index];
        Storage.readBinaryAsync(target.backup, (backup) => {
            if (!backup) return onDone(false, target.backup);
            preflight(index + 1);
        });
    };
    invalidBootPath(
        targets,
        deviceModel,
        (invalid) => {
            if (invalid) onDone(false, invalid);
            else preflight(0);
        },
        true,
    );
}
