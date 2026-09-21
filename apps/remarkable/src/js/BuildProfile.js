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

function canWrite(path) {
    if (!isTest) return true;
    if (typeof path !== "string" || path.indexOf(appDirectory + "/") !== 0)
        return false;

    const relative = path.slice(appDirectory.length + 1);
    return (
        /^[a-zA-Z0-9_.\/-]+$/.test(relative) &&
        relative
            .split("/")
            .every((part) => part !== "" && part !== "." && part !== "..")
    );
}

const powerImageEndpoint = "http://127.0.0.1:" + (isTest ? "47832" : "47831");
