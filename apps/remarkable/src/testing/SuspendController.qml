import QtQuick 2.15
import "../js/BuildProfile.js" as BuildProfile
import "../js/BinaryFiles.js" as BinaryFiles
import "../js/Storage.js" as Storage
import "../js/SuspendRender.js" as SuspendRender

QtObject {
    id: controller

    property bool enabled: BuildProfile.isTest
    property bool canRender: false
    property bool busy: false
    property string statusText: ""
    property string previewPath: BuildProfile.suspendPath
    property string backupPath: BuildProfile.appDirectory + "/device-suspend-original.png"
    property string deviceImagePath: "/usr/share/remarkable/suspended.png"
    property string deviceImageDirectory: "/usr/share/remarkable"
    property string backupDirectory: BuildProfile.appDirectory
    property var screenTargets: SuspendRender.imageTargets(controller.deviceImageDirectory).map(target => Object.assign({}, target, {
        backup: target.state === "sleep" ? controller.backupPath : controller.backupDirectory + "/device-" + target.filename.replace(".png", "") + "-original.png",
        preview: target.state === "sleep" ? controller.previewPath : controller.backupDirectory + "/developer-" + target.filename
    }))
    property var renderPreview: null
    property var renderPreviews: null
    property var writeDeviceImage: function (buffer, onDone) {
        BinaryFiles.write("/usr/share/remarkable/suspended.png", buffer, onDone);
    }
    property var writeDeviceTarget: function (path, buffer, onDone) {
        if (!SuspendRender.imageTargets("/usr/share/remarkable").some(target => target.path === path)) {
            onDone("Refusing unsupported screen: " + path);
            return;
        }
        BinaryFiles.write(path, buffer, onDone);
    }

    function preview() {
        controller._render(false);
    }

    function writeOnce() {
        controller._render(true);
    }

    function _render(publish) {
        if (!controller.enabled || controller.busy || !controller.canRender || !controller.renderPreview)
            return;

        controller.busy = true;
        controller.statusText = "Rendering preview…";
        controller.renderPreview(ok => {
            if (!ok) {
                controller._finish("Could not render preview. Device image unchanged.");
                return;
            }
            if (publish)
                controller._backupAndPublish();
            else
                controller._finish("Preview saved. Device image unchanged.");
        });
    }

    function _backupAndPublish() {
        _ensureBackup({ path: controller.deviceImagePath, backup: controller.backupPath }, error => {
            if (error) controller._finish(error);
            else controller._publish();
        });
    }

    function _ensureBackup(target, onDone) {
        // Keep the original across repeated writes and app restarts, separate from stable's backup.
        if (Storage.readJson(target.backup + ".verified") === true) {
            onDone(Storage.readBinary(target.backup) ? "" : "Original backup is unreadable: " + target.backup);
            return;
        }

        controller.statusText = "Backing up " + target.path + "…";
        SuspendRender.copyFile(target.path, target.backup, ok => {
            if (!ok) {
                onDone("Backup failed. Device images unchanged: " + target.path);
                return;
            }
            Storage.writeJson(target.backup + ".verified", true, error =>
                onDone(error ? "Could not verify backup. Device images unchanged: " + target.backup : ""));
        });
    }

    function writeAllOnce() {
        if (!controller.enabled || controller.busy || !controller.canRender || !controller.renderPreviews)
            return;

        const targets = controller.screenTargets.filter(target => !target.optional ||
            Storage.readBinary(target.path) !== null || Storage.readBinary(target.backup) !== null ||
            Storage.readJson(target.backup + ".verified") === true);
        controller.busy = true;
        controller.statusText = "Rendering all screen previews…";
        controller.renderPreviews(targets, (ok, path) => {
            if (!ok) {
                controller._finish("Could not render previews. Device images unchanged: " + (path || ""));
                return;
            }
            controller._backupScreens(targets, 0);
        });
    }

    function _backupScreens(targets, index) {
        if (index === targets.length) {
            _writeScreens(targets, 0, false);
            return;
        }
        _ensureBackup(targets[index], error => {
            if (error) controller._finish(error);
            else controller._backupScreens(targets, index + 1);
        });
    }

    function restoreAll() {
        if (!controller.enabled || controller.busy)
            return;

        const targets = controller.screenTargets.filter(target => Storage.readBinary(target.backup) !== null ||
            !Storage.isMissing(Storage.readJson(target.backup + ".verified")));
        if (!targets.length) {
            controller.statusText = "No original screen backups. Write test images first.";
            return;
        }
        const invalid = targets.find(target => Storage.readJson(target.backup + ".verified") !== true ||
            Storage.readBinary(target.backup) === null);
        if (invalid) {
            controller.statusText = "Original backup is unverified or unreadable: " + invalid.backup;
            return;
        }
        controller.busy = true;
        _writeScreens(targets, 0, true);
    }

    function _writeScreens(targets, index, restoring) {
        if (index === targets.length) {
            controller._finish(restoring ? "Original screen images restored." : "All available screens written once. Automatic device writes remain off.");
            return;
        }
        const target = targets[index];
        const source = restoring ? target.backup : target.preview;
        const image = Storage.readBinary(source);
        if (!image) {
            controller._finish("Could not read image: " + source);
            return;
        }
        controller.statusText = "Writing " + target.path + "…";
        controller.writeDeviceTarget(target.path, image, error => {
            if (error) controller._finish("Could not write " + target.path + ": " + error);
            else controller._writeScreens(targets, index + 1, restoring);
        });
    }

    function _publish() {
        controller._writeImage(controller.previewPath, "Suspend image written once. Automatic writes remain off.");
    }

    function restore() {
        if (!controller.enabled || controller.busy)
            return;

        if (Storage.readJson(controller.backupPath + ".verified") !== true) {
            controller.statusText = "No verified original backup. Write a test image first.";
            return;
        }

        controller.busy = true;
        controller._writeImage(controller.backupPath, "Original suspend image restored.");
    }

    function _writeImage(path, successMessage) {
        const image = Storage.readBinary(path);
        if (!image) {
            controller._finish("Could not read image: " + path);
            return;
        }

        controller.statusText = "Writing suspend image…";
        controller.writeDeviceImage(image, error => controller._finish(error || successMessage));
    }

    function _finish(message) {
        controller.statusText = message;
        controller.busy = false;
    }
}
