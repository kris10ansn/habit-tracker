import QtQuick 2.15
import ".." as App
import "../js/BuildProfile.js" as BuildProfile

QtObject {
    id: controller
    property bool enabled: BuildProfile.isTest
    property bool canRender: false
    property bool busy: false
    property string statusText: ""
    property string previewPath: BuildProfile.appDirectory + "/suspend-preview.png"
    property string backupPath: BuildProfile.appDirectory + "/device-suspend-original.png"
    property var renderPreview: null
    property App.PowerImageClient client: App.PowerImageClient {}
    property var sendRequest: function (operation, payload, onDone) { client.request(operation, payload, onDone); }

    function preview() { _render(false); }
    function writeOnce() { _render(true); }
    function _render(publish) {
        if (!enabled || busy || !canRender || !renderPreview) return;
        controller.busy = true;
        controller.statusText = "Rendering preview…";
        renderPreview(ok => {
            if (!ok) { _finish("Could not render preview. Device image unchanged."); return; }
            if (!publish) { _finish("Preview saved. Device image unchanged."); return; }
            controller.statusText = "Writing suspend image…";
            sendRequest("test-write", {}, result => _finish(result.ok
                ? "Suspend image written once. Automatic writes remain off." : result.error));
        });
    }
    function restore() {
        if (!enabled || busy) return;
        controller.busy = true;
        controller.statusText = "Restoring original image…";
        sendRequest("test-restore", {}, result => _finish(result.ok ? "Original suspend image restored." : result.error));
    }
    function _finish(message) {
        controller.statusText = message;
        controller.busy = false;
    }
}
