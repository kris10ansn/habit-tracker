// Host-test inspection only. Application I/O is asynchronous.
.import "../src/js/Storage.js" as AsyncStorage
const MISSING = "missing";
const CORRUPT = "corrupt";
function readFile(path) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `file://${path}`, false);
    xhr.send();
    return xhr.responseText || MISSING;
}
function readJson(path) {
    const body = readFile(path);
    if (body === MISSING) return MISSING;
    try { return JSON.parse(body); } catch (error) { return CORRUPT; }
}
function readBinary(path) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `file://${path}`, false);
    xhr.responseType = "arraybuffer";
    xhr.send();
    return xhr.response && xhr.response.byteLength ? xhr.response : null;
}
function isMissing(value) { return value === MISSING; }
function isCorrupt(value) { return value === CORRUPT; }
function writeFile(path, body, onDone) { AsyncStorage.writeFile(path, body, onDone); }
function writeJson(path, value, onDone) { AsyncStorage.writeJson(path, value, onDone); }
function writeBinary(path, value, onDone) { AsyncStorage.writeBinary(path, value, onDone); }
