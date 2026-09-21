.import "BuildProfile.js" as BuildProfile
.import "BinaryFiles.js" as BinaryFiles

const MISSING = "missing";
const CORRUPT = "corrupt";
const queues = {};

// Reads share the write queue: revisiting a month waits for its last verified save.
function enqueue(path, operation) {
    if (!queues[path]) queues[path] = [];
    queues[path].push(operation);
    if (queues[path].length === 1) runNext(path);
}

function runNext(path) {
    const queue = queues[path];
    if (!queue || !queue.length) return;
    queue[0](() => {
        queue.shift();
        if (!queue.length) delete queues[path];
        else runNext(path);
    });
}

function rawText(path, onDone) {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
        if (xhr.readyState === xhr.DONE)
            onDone(xhr.status === 200 || xhr.status === 0 ? xhr.responseText : null);
    };
    try {
        xhr.open("GET", `file://${path}`, true);
        xhr.send();
    } catch (error) {
        xhr.onreadystatechange = null;
        onDone(null);
    }
}

function readFile(path, onDone) {
    enqueue(path, next => rawText(path, body => {
        onDone(body || MISSING);
        next();
    }));
}

function readJson(path, onDone) {
    readFile(path, body => onDone(parseJson(body)));
}

function parseJson(body) {
    if (body === MISSING) return MISSING;
    try { return JSON.parse(body); }
    catch (error) { return CORRUPT; }
}

function reportWrite(onDone, error) {
    if (error) console.warn(error);
    if (typeof onDone === "function") onDone(error);
}

function writeFile(path, body, onDone) {
    if (!BuildProfile.canWrite(path)) {
        reportWrite(onDone, `Test build: refusing write outside its app directory: ${path}`);
        return;
    }
    enqueue(path, next => putText(path, body, error => {
        reportWrite(onDone, error);
        next();
    }));
}

function putText(path, body, onDone) {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
        if (xhr.readyState !== xhr.DONE) return;
        rawText(path, written => onDone(written === body ? null : `Storage: write failed for ${path}`));
    };
    try {
        xhr.open("PUT", `file://${path}`, true);
        xhr.send(body);
    } catch (error) {
        xhr.onreadystatechange = null;
        onDone(`Storage: write failed for ${path} - ${error}`);
    }
}

function writeJson(path, value, onDone) {
    const body = JSON.stringify(value);
    if (typeof body !== "string" || body === "")
        throw new Error(`Storage: refusing to write empty body for ${path}`);
    writeFile(path, body, onDone);
}

function isMissing(result) { return result === MISSING; }
function isCorrupt(result) { return result === CORRUPT; }
function readBinary(path, onDone) { BinaryFiles.read(path, onDone); }
function writeBinary(path, buffer, onDone) {
    if (!BuildProfile.canWrite(path)) {
        reportWrite(onDone, `Test build: refusing write outside its app directory: ${path}`);
        return;
    }
    BinaryFiles.write(path, buffer, error => reportWrite(onDone, error));
}
