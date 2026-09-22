const version = 1;
const operations = [
    "backup",
    "restore",
    "render",
    "handoff",
    "developer-preview",
    "developer-write",
    "developer-restore",
    "developer-write-all",
    "developer-restore-all",
];

function parseDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return null;
    const parts = value.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.getFullYear() === parts[0] &&
        date.getMonth() === parts[1] - 1 &&
        date.getDate() === parts[2]
        ? date
        : null;
}

const validHabit = (habit) => {
    if (
        !habit ||
        typeof habit.name !== "string" ||
        typeof habit.isPrivate !== "boolean" ||
        !["Positive", "Negative"].includes(habit.polarity)
    )
        return false;
    if (
        !habit.entries ||
        typeof habit.entries !== "object" ||
        Array.isArray(habit.entries)
    )
        return false;
    return Object.keys(habit.entries).every(
        (date) =>
            parseDate(date) !== null &&
            ["x", "o"].includes(habit.entries[date]),
    );
};

function validate(request, isTest) {
    if (
        !request ||
        request.version !== version ||
        typeof request.id !== "string" ||
        request.id.length > 100 ||
        !request.id.length
    )
        return "Unsupported image request";
    if (!operations.includes(request.operation))
        return "Unknown image operation";
    if (request.operation.indexOf("developer-") === 0 && !isTest)
        return "Developer image writes require the test build";
    if (
        [
            "backup",
            "restore",
            "developer-restore",
            "developer-restore-all",
        ].includes(request.operation)
    )
        return "";
    if (
        !parseDate(request.date) ||
        !Array.isArray(request.snapshot) ||
        !request.snapshot.every(validHabit)
    )
        return "Invalid image snapshot";
    return "";
}
