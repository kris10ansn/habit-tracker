.import "Storage.js" as Storage

function copyFile(srcPath, dstPath) {
    const buf = Storage.readBinary(srcPath);
    if (buf === null) {
        console.warn("SuspendRender: could not read", srcPath);
        return false;
    }

    const ok = Storage.writeBinary(dstPath, buf);
    if (!ok) {
        console.warn("SuspendRender: could not write", dstPath);
    }

    return ok;
}

function readSignature(path) {
    const sig = Storage.readJson(path);
    return typeof sig === "string" ? sig : "";
}

function writeSignature(path, signature) {
    return Storage.writeJson(path, signature);
}
