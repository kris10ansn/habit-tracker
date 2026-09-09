function message(status, responseText) {
    const fallback = "Server returned " + status;

    let body;
    try {
        body = JSON.parse(responseText);
    } catch (error) {
        return fallback;
    }

    if (!body || typeof body !== "object" || typeof body.title !== "string") {
        return fallback;
    }

    const title = body.title.trim();
    return title || fallback;
}
