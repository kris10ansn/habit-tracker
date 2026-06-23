const MISSING = "missing";
const CORRUPT = "corrupt";

function readJson(path) {
    try {
        const xhr = new XMLHttpRequest();

        xhr.open("GET", `file://${path}`, false);
        xhr.send();

        const ok = xhr.status === 200 || xhr.status === 0;
        if (!ok || !xhr.responseText) return MISSING;

        try {
            return JSON.parse(xhr.responseText);
        } catch (e) {
            console.warn("Storage: corrupt JSON at", path, "-", e);
            return CORRUPT;
        }
    } catch (e) {
        console.log("Storage: could not read", path, "-", e);
        return MISSING;
    }
}

function isMissing(result) {
    return result === MISSING;
}
function isCorrupt(result) {
    return result === CORRUPT;
}

// Throws on failure rather than swallowing it: a silent failed save (e.g. the
// data/ directory missing) would lose data invisibly. Callers that genuinely
// want best-effort writes must catch. The PUT is synchronous so xhr.status is
// meaningful by the time send() returns.
function writeJson(path, value) {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `file://${path}`, false);

    try {
        xhr.send(JSON.stringify(value));
    } catch (e) {
        throw new Error(`Storage: write failed for ${path} - ${e}`);
    }

    const ok = xhr.status === 200 || xhr.status === 0;
    if (!ok) {
        throw new Error(
            `Storage: write failed (status ${xhr.status}) for ${path}`,
        );
    }
}

function readBinary(path) {
    try {
        const xhr = new XMLHttpRequest();

        xhr.open("GET", `file://${path}`, false);
        xhr.responseType = "arraybuffer";
        xhr.send();

        const ok = xhr.status === 200 || xhr.status === 0;
        return ok && xhr.response ? xhr.response : null;
    } catch (e) {
        console.log("Storage: could not read binary", path, "-", e);
        return null;
    }
}

function writeBinary(path, buffer) {
    try {
        const xhr = new XMLHttpRequest();

        xhr.open("PUT", `file://${path}`);
        xhr.send(buffer);

        return true;
    } catch (e) {
        console.log("Storage: could not write binary", path, "-", e);
        return false;
    }
}
