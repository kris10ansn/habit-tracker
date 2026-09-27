const isTest = false;
const appId = isTest ? "habit-tracker-test" : "habit-tracker";
const appDirectory = "/home/root/xovi/exthome/appload/" + appId;
const dataDirectory = appDirectory + "/data";
const settingsPath = appDirectory + "/settings.json";
function canWrite(path) {
    if (!isTest) return true;
    const directory = appDirectory;
    if (typeof path !== "string" || path.indexOf(directory + "/") !== 0)
        return false;

    const relative = path.slice(directory.length + 1);
    return (
        /^[a-zA-Z0-9_.\/-]+$/.test(relative) &&
        relative
            .split("/")
            .every((part) => part !== "" && part !== "." && part !== "..")
    );
}
