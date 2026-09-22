const isTest = false;
const appId = isTest ? "habit-tracker-test" : "habit-tracker";
const appDirectory = "/home/root/xovi/exthome/appload/" + appId;
const dataDirectory = appDirectory + "/data";
const settingsPath = appDirectory + "/settings.json";
const suspendPath = isTest
    ? appDirectory + "/suspend-preview.png"
    : "/usr/share/remarkable/suspended.png";
const suspendBackupPath = isTest
    ? appDirectory + "/suspend-preview.png.bak"
    : "/usr/share/remarkable/suspended.png.bak";
const signaturePath = appDirectory + "/.sleep-sig";

let imageWorkerDirectory = null;

// Trusted worker bootstrap only; frontend requests cannot configure paths.
function configureImageWorker(directory) {
    imageWorkerDirectory = directory;
}

function canWrite(path) {
    if (!isTest) return true;
    const directory = imageWorkerDirectory || appDirectory;
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
