.import "Storage.js" as Storage

// Storage reports a write only once it has landed, so both of these answer through a callback
// rather than a return value. Reporting the copy synchronously is what let a failed suspend-image
// backup read as a success — and enabling the feature on that answer overwrites the stock image
// with no way back (ADR 0001).

function copyFile(srcPath, dstPath, onDone) {
    const buffer = Storage.readBinary(srcPath);
    if (!buffer || !buffer.byteLength) {
        console.warn("SuspendRender: could not read", srcPath);
        onDone(false);
        return;
    }

    Storage.writeBinary(dstPath, buffer, (error) => {
        if (error) {
            console.warn("SuspendRender: could not write", dstPath);
        }
        onDone(!error);
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

function availableImageTargets(targets) {
    return targets.filter(
        (target) =>
            !target.optional ||
            Storage.readBinary(target.path) !== null ||
            Storage.readBinary(target.backup) !== null,
    );
}

// Existing backups survive retries, upgrades from suspend-only writing, and re-enabling.
// Back up every target before any image is replaced.
function backupImages(targets, onDone) {
    const next = (index) => {
        if (index === targets.length) return onDone(true, "");

        const target = targets[index];
        const existing = Storage.readBinary(target.backup);
        if (existing !== null) {
            if (!existing.byteLength) return onDone(false, target.backup);
            next(index + 1);
            return;
        }
        copyFile(target.path, target.backup, (ok) => {
            if (!ok) return onDone(false, target.path);
            next(index + 1);
        });
    };
    next(0);
}

function restoreImages(targets, onDone) {
    const missing = targets.find((target) => {
        const backup = Storage.readBinary(target.backup);
        return !backup || !backup.byteLength;
    });
    if (missing) return onDone(false, missing.backup);

    const next = (index) => {
        if (index === targets.length) return onDone(true, "");

        const target = targets[index];
        copyFile(target.backup, target.path, (ok) => {
            if (!ok) return onDone(false, target.path);
            next(index + 1);
        });
    };
    next(0);
}
