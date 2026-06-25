const MISSING = "missing";
const CORRUPT = "corrupt";

const ok = (status) => status === 200 || status === 0;

function writeFile(path, body) {
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = () => {
        if (xhr.readyState !== xhr.DONE) return;
        if (ok(xhr.status)) return;

        throw new Error(
            `Storage: write failed (status ${xhr.status}) for ${path}`,
        );
    };

    try {
        xhr.open("PUT", "file://" + path);
        xhr.send(body);
    } catch (error) {
        throw new Error(`Storage: write failed for ${path} - ${error}`);
    }
}

function readFile(path) {
    try {
        const xhr = new XMLHttpRequest();

        xhr.open("GET", `file://${path}`, false);
        xhr.send();

        if (!ok(xhr.status) || !xhr.responseText) return MISSING;

        return xhr.responseText;
    } catch (e) {
        console.warn("Storage: could not read", path, "-", e);
        return MISSING;
    }
}

function readJson(path) {
    const body = readFile(path);
    if (body === MISSING) return MISSING;

    try {
        return JSON.parse(body);
    } catch (e) {
        console.warn("Storage: corrupt JSON at", path, "-", e);
        return CORRUPT;
    }
}

function writeJson(path, value) {
    const body = JSON.stringify(value);

    if (typeof body !== "string" || body === "") {
        throw new Error(`Storage: refusing to write empty body for ${path}`);
    }

    writeFile(path, body);
}

function isMissing(result) {
    return result === MISSING;
}
function isCorrupt(result) {
    return result === CORRUPT;
}

function readBinary(path) {
    try {
        const xhr = new XMLHttpRequest();

        xhr.open("GET", `file://${path}`, false);
        xhr.responseType = "arraybuffer";
        xhr.send();

        return ok(xhr.status) && xhr.response ? xhr.response : null;
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
