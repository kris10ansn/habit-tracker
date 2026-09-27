const version = 2;
const operations = [
    "backup",
    "restore",
    "render",
    "developer-preview",
    "developer-write",
    "developer-restore",
    "developer-write-all",
    "developer-restore-all",
];

function parseDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parts = value.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1 && date.getDate() === parts[2] ? date : null;
}

function validate(request, isTest) {
    if (!request || request.version !== version || typeof request.id !== "string" || !request.id.length || request.id.length > 100)
        return "Unsupported image request";
    if (!operations.includes(request.operation)) return "Unknown image operation";
    if (request.operation.indexOf("developer-") === 0 && !isTest) return "Developer image writes require the test build";
    if (["backup", "restore", "developer-restore", "developer-restore-all"].includes(request.operation)) return "";
    const expected = request.expected;
    if (!parseDate(request.date) || !expected || !/^[0-9a-f]{32}$/.test(expected.roster) ||
        (expected.month !== "missing" && !/^[0-9a-f]{32}$/.test(expected.month))) return "Confirmed saved habit data is required";
    return "";
}
