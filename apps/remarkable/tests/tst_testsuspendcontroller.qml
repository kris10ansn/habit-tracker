import QtQuick 2.15
import QtTest 1.2
import "../src/testing" as Testing
import "../src/js/Storage.js" as Storage
import "TestPaths.js" as TestPaths

TestCase {
    id: testCase
    name: "TestSuspendController"

    property var controller: null
    property int sequence: 0
    property int renders: 0
    property int deviceWrites: 0
    property bool renderSucceeds: true
    property string directoryPrefix: ""

    Component {
        id: factory
        Testing.SuspendController {}
    }

    function writeText(path, text) {
        let finished = false;
        Storage.writeFile(path, text, error => {
            compare(error, null);
            finished = true;
        });
        tryVerify(() => finished);
    }

    function createController() {
        controller = factory.createObject(testCase, {
            enabled: true,
            canRender: true,
            previewPath: directoryPrefix + "preview.png",
            backupPath: directoryPrefix + "original.png",
            deviceImagePath: directoryPrefix + "device.png",
            renderPreview: function (onDone) {
                renders += 1;
                Qt.callLater(() => onDone(renderSucceeds));
            },
            writeDeviceImage: function (buffer, onDone) {
                deviceWrites += 1;
                Storage.writeBinary(directoryPrefix + "device.png", buffer, onDone);
            }
        });
    }

    function init() {
        sequence += 1;
        directoryPrefix = TestPaths.tmpPath("developer-" + sequence + "-");
        renders = 0;
        deviceWrites = 0;
        renderSucceeds = true;
        writeText(directoryPrefix + "preview.png", "test grid");
        writeText(directoryPrefix + "device.png", "original image");
        createController();
    }

    function cleanup() {
        controller.destroy();
    }

    function test_startupAndPreviewNeverWriteDevice() {
        wait(20);
        compare(deviceWrites, 0);
        compare(renders, 0);
        controller.preview();
        tryVerify(() => !controller.busy);
        compare(renders, 1);
        compare(deviceWrites, 0);
        compare(Storage.readFile(controller.deviceImagePath), "original image");
        compare(Storage.readBinary(controller.backupPath), null);
    }

    function test_repeatedWritesAndRestartPreserveOriginalForRestore() {
        controller.writeOnce();
        tryVerify(() => !controller.busy);
        compare(Storage.readFile(controller.deviceImagePath), "test grid");
        compare(Storage.readFile(controller.backupPath), "original image");

        controller.destroy();
        createController();
        writeText(controller.previewPath, "second test grid");
        controller.writeOnce();
        tryVerify(() => !controller.busy);
        compare(Storage.readFile(controller.deviceImagePath), "second test grid");
        compare(Storage.readFile(controller.backupPath), "original image");

        controller.canRender = false;
        controller.restore();
        tryVerify(() => !controller.busy);
        compare(Storage.readFile(controller.deviceImagePath), "original image");
        compare(deviceWrites, 3);
    }

    function test_failedBackupNeverWritesDevice() {
        controller.backupPath = TestPaths.tmpPath("missing-directory/original.png");
        controller.writeOnce();
        tryVerify(() => !controller.busy);
        compare(deviceWrites, 0);
        verify(controller.statusText.indexOf("Backup failed") !== -1);
    }

    function test_unverifiedPartialBackupIsReplacedBeforeWriting() {
        writeText(controller.backupPath, "partial failed backup");
        controller.writeOnce();
        tryVerify(() => !controller.busy);
        compare(Storage.readFile(controller.backupPath), "original image");
        compare(Storage.readFile(controller.deviceImagePath), "test grid");
    }

    function test_missingVerifiedBackupIsNotReplacedWithATestImage() {
        writeText(controller.backupPath + ".verified", "true");
        controller.writeOnce();
        tryVerify(() => !controller.busy);
        compare(deviceWrites, 0);
        compare(Storage.readBinary(controller.backupPath), null);
        verify(controller.statusText.indexOf("unreadable") !== -1);
    }

    function test_failedRenderNeverWritesDevice() {
        renderSucceeds = false;
        controller.writeOnce();
        tryVerify(() => !controller.busy);
        compare(deviceWrites, 0);
        compare(Storage.readBinary(controller.backupPath), null);
    }

    function test_disabledOrUnreadableDataCannotRender() {
        controller.enabled = false;
        controller.writeOnce();
        controller.preview();
        controller.restore();
        compare(renders, 0);
        compare(deviceWrites, 0);
        controller.enabled = true;
        controller.canRender = false;
        controller.writeOnce();
        compare(renders, 0);
    }

    function test_busyIgnoresDoubleTapAndRestore() {
        controller.writeOnce();
        controller.writeOnce();
        controller.restore();
        tryVerify(() => !controller.busy);
        compare(renders, 1);
        compare(deviceWrites, 1);
    }

    function test_restoreWithoutBackupDoesNotWriteDevice() {
        controller.restore();
        compare(deviceWrites, 0);
        compare(controller.busy, false);
        verify(controller.statusText.indexOf("No verified") !== -1);
    }

    function test_writeFailureIsReportedAndBackupSurvives() {
        controller.writeDeviceImage = function (buffer, onDone) { onDone("Device write failed"); };
        controller.writeOnce();
        tryVerify(() => !controller.busy);
        compare(controller.statusText, "Device write failed");
        compare(Storage.readFile(controller.backupPath), "original image");
    }
}
