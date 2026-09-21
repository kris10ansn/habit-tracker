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
    property var renderPreview: null
    property var writeDeviceImage: function (buffer, onDone) {
        BinaryFiles.write("/usr/share/remarkable/suspended.png", buffer, onDone);
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
        // Keep the original across repeated writes and app restarts, separate from stable's backup.
        Storage.readJson(controller.backupPath + ".verified", verified => {
            if (verified === true) {
                controller._publishWithExistingBackup();
                return;
            }
            controller._backupOriginal();
        });
    }

    function _backupOriginal() {
        controller.statusText = "Backing up original image…";
        SuspendRender.copyFile(controller.deviceImagePath, controller.backupPath, ok => {
            if (!ok) {
                controller._finish("Backup failed. Device image unchanged.");
                return;
            }
            controller._markBackupVerified();
        });
    }

    function _publishWithExistingBackup() {
        if (Storage.readBinary(controller.backupPath) === null) {
            controller._finish("Original backup is unreadable. Device image unchanged.");
            return;
        }
        controller._publish();
    }

    function _markBackupVerified() {
        Storage.writeJson(controller.backupPath + ".verified", true, error => {
            if (error) {
                controller._finish("Could not verify backup. Device image unchanged.");
                return;
            }
            controller._publish();
        });
    }

    function _publish() {
        controller._writeImage(controller.previewPath, "Suspend image written once. Automatic writes remain off.");
    }

    function restore() {
        if (!controller.enabled || controller.busy)
            return;

        controller.busy = true;
        Storage.readJson(controller.backupPath + ".verified", verified => {
            if (verified !== true) {
                controller._finish("No verified original backup. Write a test image first.");
                return;
            }
            controller._writeImage(controller.backupPath, "Original suspend image restored.");
        });
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
