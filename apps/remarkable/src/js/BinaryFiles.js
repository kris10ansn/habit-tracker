const readResult = (xhr) => {
    // Qt returns an empty buffer for an unreadable file as well as an empty one.
    const readable =
        (xhr.status === 200 || xhr.status === 0) &&
        xhr.response &&
        xhr.response.byteLength > 0;
    return readable ? xhr.response : null;
};

function read(path) {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", `file://${path}`, false);
        xhr.responseType = "arraybuffer";
        xhr.send();
        return readResult(xhr);
    } catch (error) {
        console.warn("Storage: could not read binary", path, "-", error);
        return null;
    }
}

function readAsync(path, onDone) {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
        if (xhr.readyState === xhr.DONE) onDone(readResult(xhr));
    };
    try {
        xhr.open("GET", `file://${path}`);
        xhr.responseType = "arraybuffer";
        xhr.send();
    } catch (error) {
        console.warn("Storage: could not read binary", path, "-", error);
        onDone(null);
    }
}

const equalChunk = (
    actual,
    expected,
    actualWords,
    expectedWords,
    start,
    end,
) => {
    const wordEnd = Math.floor(end / 4);
    for (let word = start / 4; word < wordEnd; word++) {
        if (actualWords[word] !== expectedWords[word]) return false;
    }
    // The final chunk can end between words; every trailing byte still matters.
    for (let index = wordEnd * 4; index < end; index++) {
        if (actual[index] !== expected[index]) return false;
    }
    return true;
};

const verifyBytes = (written, expected, onDone) => {
    if (!written || written.byteLength !== expected.length) {
        onDone(false);
        return;
    }

    const actual = new Uint8Array(written);
    const wordCount = Math.floor(expected.length / 4);
    const actualWords = new Uint32Array(written, 0, wordCount);
    const expectedWords = new Uint32Array(expected.buffer, 0, wordCount);
    let offset = 0;
    const next = () => {
        const end = Math.min(offset + 16384, expected.length);
        if (
            !equalChunk(
                actual,
                expected,
                actualWords,
                expectedWords,
                offset,
                end,
            )
        )
            return onDone(false);
        offset = end;
        if (offset === expected.length) onDone(true);
        else Qt.callLater(next);
    };
    next();
};

// A failed overwrite can leave an older image of the same size. Verify every byte,
// yielding between chunks so a screen-sized backup does not monopolize the UI thread.
function write(path, buffer, onDone) {
    const xhr = new XMLHttpRequest();
    const expected = buffer ? new Uint8Array(buffer) : new Uint8Array(0);
    const report = (landed) =>
        onDone(landed ? null : `Storage: binary write failed for ${path}`);

    xhr.onreadystatechange = () => {
        if (xhr.readyState !== xhr.DONE) return;
        readAsync(path, (written) => verifyBytes(written, expected, report));
    };

    try {
        xhr.open("PUT", `file://${path}`);
        xhr.send(buffer);
    } catch (error) {
        onDone(`Storage: binary write failed for ${path} - ${error}`);
    }
}
