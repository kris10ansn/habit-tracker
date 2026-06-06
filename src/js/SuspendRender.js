.import "Storage.js" as Storage

function ensureBackup(srcPath, bakPath) {
    if (Storage.fileExists(bakPath)) return true;

    const buf = Storage.readBinary(srcPath);
    if (buf === null) {
        console.warn("SuspendRender: could not read source for backup", srcPath);
        return false;
    }

    const ok = Storage.writeBinary(bakPath, buf);
    if (!ok) console.warn("SuspendRender: could not write backup", bakPath);
    return ok;
}

function readSignature(path) {
    const sig = Storage.readJson(path);
    return typeof sig === "string" ? sig : "";
}

function writeSignature(path, signature) {
    return Storage.writeJson(path, signature);
}
