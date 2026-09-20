import QtQuick 2.15
import "../components" as App
import "../js/BuildProfile.js" as BuildProfile

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

    SuspendController {
        id: controller
        canRender: tools.canRender
        previewPath: preview.targetPath
        renderPreview: function (onDone) { preview.renderOnce(onDone); }
    }

    DeveloperPage {
        anchors.fill: parent
        busy: controller.busy
        canRender: controller.canRender
        statusText: controller.statusText
        dataDirectory: tools.dataDirectory
        previewPath: controller.previewPath
        backupPath: controller.backupPath
        onPreviewRequested: controller.preview()
        onWriteRequested: controller.writeOnce()
        onRestoreRequested: controller.restore()
        onBackRequested: tools.backRequested()
    }
}
