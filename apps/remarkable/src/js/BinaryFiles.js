function read(path, onDone) {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
        if (xhr.readyState !== xhr.DONE) return;
        const buffer = xhr.response;
        onDone(
            (xhr.status === 200 || xhr.status === 0) &&
                buffer &&
                buffer.byteLength
                ? buffer
                : null,
        );
    };
    try {
        xhr.open("GET", `file://${path}`, true);
        xhr.responseType = "arraybuffer";
        xhr.send();
    } catch (error) {
        xhr.onreadystatechange = null;
        onDone(null);
    }
}

function write(path, buffer, onDone) {
    const xhr = new XMLHttpRequest();
    const expected = buffer ? new Uint8Array(buffer) : new Uint8Array(0);
    xhr.onreadystatechange = () => {
        if (xhr.readyState !== xhr.DONE) return;
        read(path, (written) => {
            const landed =
                !!written &&
                written.byteLength === expected.length &&
                new Uint8Array(written).every(
                    (value, index) => value === expected[index],
                );
            onDone(landed ? null : `Storage: binary write failed for ${path}`);
        });
    };
    try {
        xhr.open("PUT", `file://${path}`, true);
        xhr.send(buffer);
    } catch (error) {
        xhr.onreadystatechange = null;
        onDone(`Storage: binary write failed for ${path} - ${error}`);
    }
}
