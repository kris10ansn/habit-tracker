import QtQuick 2.15
import "../js/DateUtils.js" as DateUtils
import "../js/BuildProfile.js" as BuildProfile

Item {
    id: tools

    property var habitsStore: null
    property bool canRender: false
    property string dataDirectory: ""
    signal backRequested

    property var backend: null
    property string statusText: ""
    property bool preparing: false
    readonly property bool busy: preparing || (!!backend && backend.busy)
    readonly property string previewPath: BuildProfile.appDirectory + "/developer-preview.png"
    readonly property string backupPath: BuildProfile.appDirectory + "/device-suspend-original.png"

    Connections {
        target: tools.backend
        function onFailed(message) { tools.statusText = message; }
        function onProgress(operation, phase, message) {
            if (operation.indexOf("developer-") === 0 && message) tools.statusText = message;
        }
    }
    function run(operation) {
        if (!backend || busy) return;
        const restoring = operation === "developer-restore" || operation === "developer-restore-all";
        if (!restoring && !canRender) return;
        const date = new Date();
        const dateText = DateUtils.dateKey(date.getFullYear(), date.getMonth(), date.getDate());
        statusText = restoring ? "Restoring original images…" : "Preparing power-state images…";
        if (restoring) {
            backend.request(operation, {}, result => tools.statusText = result.message || result.error || "Original images restored");
            return;
        }
        preparing = true;
        habitsStore.prepareImageInput((error, expected) => {
            if (error) { tools.statusText = error; preparing = false; return; }
            backend.request(operation, { expected: expected, date: dateText }, result => tools.statusText = result.message || result.error || "Image operation finished");
            preparing = false;
        });
    }

    DeveloperPage {
        anchors.fill: parent
        busy: tools.busy
        canRender: tools.canRender
        statusText: tools.statusText
        dataDirectory: tools.dataDirectory
        previewPath: tools.previewPath
        backupPath: tools.backupPath
        backupDirectory: BuildProfile.appDirectory
        onPreviewRequested: tools.run("developer-preview")
        onWriteRequested: tools.run("developer-write")
        onRestoreRequested: tools.run("developer-restore")
        onWriteAllRequested: tools.run("developer-write-all")
        onRestoreAllRequested: tools.run("developer-restore-all")
        onBackRequested: tools.backRequested()
    }
}
