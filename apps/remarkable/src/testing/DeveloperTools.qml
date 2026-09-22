import QtQuick 2.15
import "../components" as App
import "../js/BuildProfile.js" as BuildProfile
import "../js/HabitsModel.js" as HabitsModel

Item {
    id: tools

    property var habits: null
    property bool canRender: false
    property string dataDirectory: ""
    signal backRequested

    property var backend: null
    property string statusText: ""
    readonly property bool busy: !!backend && backend.busy
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
        const dateText = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2);
        statusText = restoring ? "Restoring original images…" : "Preparing power-state images…";
        backend.request(operation, {
            snapshot: HabitsModel.toSuspendHabits(tools.habits).filter(habit => !habit.isPrivate),
            date: dateText
        }, result => tools.statusText = result.message || result.error || "Image operation finished");
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
