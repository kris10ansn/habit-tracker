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

    App.SuspendCanvas {
        id: preview
        habits: tools.habits
        targetPath: BuildProfile.appDirectory + "/developer-preview.png"
        signaturePath: BuildProfile.appDirectory + "/.developer-preview-sig"
    }

    App.BootCanvas { id: bootPreview }

    SuspendController {
        id: controller
        canRender: tools.canRender
        previewPath: preview.targetPath
        renderPreview: function (onDone) { preview.renderOnce(onDone); }
        renderPreviews: function (targets, onDone) {
            const snapshot = HabitsModel.toSuspendHabits(tools.habits);
            const date = new Date();
            const boot = targets.find(target => target.format === "boot-bmp");
            const images = targets.filter(target => target.format !== "boot-bmp")
                .map(target => ({ state: target.state, path: target.preview }));
            preview.renderImagesOnce(images, (ok, path) => {
                if (!ok || !boot) onDone(ok, path);
                else bootPreview.renderOnce(boot.preview, snapshot, date, onDone);
            }, snapshot, date);
        }
    }

    DeveloperPage {
        anchors.fill: parent
        busy: controller.busy
        canRender: controller.canRender
        statusText: controller.statusText
        dataDirectory: tools.dataDirectory
        previewPath: controller.previewPath
        backupPath: controller.backupPath
        backupDirectory: controller.backupDirectory
        onPreviewRequested: controller.preview()
        onWriteRequested: controller.writeOnce()
        onRestoreRequested: controller.restore()
        onWriteAllRequested: controller.writeAllOnce()
        onRestoreAllRequested: controller.restoreAll()
        onBackRequested: tools.backRequested()
    }
}
