function read(path) {
    try {
        const xhr = new XMLHttpRequest();

        xhr.open("GET", `file://${path}`, false);
        xhr.responseType = "arraybuffer";
        xhr.send();

        // An unreadable file answers with a zero-length buffer rather than nothing, so length is
        // the real test — otherwise a missing suspend image copies as an empty one.
        const empty = !xhr.response || xhr.response.byteLength === 0;

        return (xhr.status === 200 || xhr.status === 0) && !empty
            ? xhr.response
            : null;
    } catch (e) {
        console.warn("Storage: could not read binary", path, "-", e);
        return null;
    }
}

// Verify bytes: a failed overwrite can leave an older image with exactly the same size.
function write(path, buffer, onDone) {
    const xhr = new XMLHttpRequest();
    const expected = buffer ? new Uint8Array(buffer) : new Uint8Array(0);

    xhr.onreadystatechange = () => {
        if (xhr.readyState !== xhr.DONE) return;

        const written = read(path);
        const landed =
            !!written &&
            written.byteLength === expected.length &&
            new Uint8Array(written).every(
                (value, index) => value === expected[index],
            );
        onDone(landed ? null : `Storage: binary write failed for ${path}`);
    };

    try {
        xhr.open("PUT", `file://${path}`);
        xhr.send(buffer);
    } catch (error) {
        onDone(`Storage: binary write failed for ${path} - ${error}`);
    }
}
