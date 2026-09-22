import QtQuick 2.15
import "../components" as App
import "../js/BuildProfile.js" as BuildProfile

Item {
    id: jobs
    property var snapshot: []
    property date today: new Date()
    property var completion: null
    readonly property bool ready: preview.available && bootPreview.available
    readonly property bool busy: controller.busy
    readonly property string statusText: controller.statusText

    App.SuspendCanvas {
        id: preview
        suppliedSnapshot: jobs.snapshot
        today: jobs.today
        targetPath: BuildProfile.appDirectory + "/developer-preview.png"
        signaturePath: BuildProfile.appDirectory + "/.developer-preview-sig"
    }
    App.BootCanvas { id: bootPreview }
    SuspendController {
        id: controller
        canRender: true
        previewPath: preview.targetPath
        renderPreview: function(onDone) { preview.renderOnce(onDone); }
        renderPreviews: function(targets, onDone) {
            const boot = targets.find(target => target.format === "boot-bmp");
            const images = targets.filter(target => target.format !== "boot-bmp")
                .map(target => ({ state: target.state, path: target.preview }));
            preview.renderImagesOnce(images, (ok, path) => {
                if (!ok || !boot) onDone(ok, path);
                else bootPreview.renderOnce(boot.preview, jobs.snapshot, jobs.today, onDone);
            }, jobs.snapshot, jobs.today);
        }
        onCompleted: function(ok, message) { jobs._finish(ok, message); }
    }

    function execute(operation, onDone) {
        jobs.completion = onDone;
        if (operation === "developer-preview") controller.preview();
        else if (operation === "developer-write") controller.writeOnce();
        else if (operation === "developer-write-all") controller.writeAllOnce();
        else if (operation === "developer-restore") controller.restore();
        else if (operation === "developer-restore-all") controller.restoreAll();
        if (!controller.busy && jobs.completion) jobs._finish(false, controller.statusText);
    }
    function _finish(ok, message) {
        if (!jobs.completion) return;
        const callback = jobs.completion;
        jobs.completion = null;
        callback(ok, message);
    }
}
