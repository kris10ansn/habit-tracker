.import "Storage.js" as Storage

function ensureBackup(srcPath, bakPath, markerPath) {
    // Gate on a tiny marker file rather than the backup itself: fileExists reads
    // the whole file, and the backup is a screen-sized PNG. Checking it on every
    // startup would read ~hundreds of KB synchronously off the load path.
    if (Storage.fileExists(markerPath)) return true;

    // Migration for installs that backed up before the marker existed: a backup
    // is already present, so don't re-copy (suspended.png may already hold a
    // habit image by now) — just record the marker. One-time cost per device.
    if (Storage.fileExists(bakPath)) {
        Storage.writeJson(markerPath, true);
        return true;
    }

    const buf = Storage.readBinary(srcPath);
    if (buf === null) {
        console.warn("SuspendRender: could not read source for backup", srcPath);
        return false;
    }

    const ok = Storage.writeBinary(bakPath, buf);
    if (!ok) {
        console.warn("SuspendRender: could not write backup", bakPath);
        return false;
    }

    Storage.writeJson(markerPath, true);
    return true;
}

function readSignature(path) {
    const sig = Storage.readJson(path);
    return typeof sig === "string" ? sig : "";
}

function writeSignature(path, signature) {
    return Storage.writeJson(path, signature);
}
