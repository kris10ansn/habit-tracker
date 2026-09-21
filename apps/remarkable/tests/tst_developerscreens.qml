import QtQuick 2.15
import QtTest 1.2
import "../src/testing" as Testing
import "../src/js/Storage.js" as Storage
import "../src/js/SuspendRender.js" as SuspendRender
import "TestPaths.js" as TestPaths

TestCase {
    id: testCase
    name: "DeveloperScreens"

    property var controller: null
    property var targets: []
    property int sequence: 0
    property int renders: 0
    property int writes: 0
    property bool renderSucceeds: true
    property string failingPath: ""

    Component { id: factory; Testing.SuspendController {} }

    function writeText(path, text) {
        let finished = false;
        Storage.writeFile(path, text, error => { compare(error, null); finished = true; });
        tryVerify(() => finished);
    }

    function createController() {
        controller = factory.createObject(testCase, {
            enabled: true,
            canRender: true,
            screenTargets: targets,
            backupPath: targets[0].backup,
            previewPath: targets[0].preview,
            deviceImagePath: targets[0].path,
            renderPreview: onDone => Qt.callLater(() => onDone(true)),
            renderPreviews: function (selected, onDone) {
                renders++;
                selected.forEach(target => writeText(target.preview, "test-" + target.state));
                Qt.callLater(() => onDone(renderSucceeds, selected[0].preview));
            },
            writeDeviceImage: (buffer, onDone) => Storage.writeBinary(targets[0].path, buffer, onDone),
            writeDeviceTarget: function (path, buffer, onDone) {
                writes++;
                targets.filter(target => !target.optional || Storage.readBinary(target.path)).forEach(target => {
                    compare(Storage.readJson(target.backup + ".verified"), true);
                    verify(Storage.readBinary(target.backup) !== null);
                });
                if (path === failingPath) onDone("simulated write failure");
                else Storage.writeBinary(path, buffer, onDone);
            }
        });
    }

    function init() {
        sequence++;
        renders = 0;
        writes = 0;
        renderSucceeds = true;
        failingPath = "";
        targets = SuspendRender.imageTargets(TestPaths.tmpDir()).map(target => Object.assign({}, target, {
            path: TestPaths.tmpPath("all-" + sequence + "-" + target.filename),
            backup: TestPaths.tmpPath("all-" + sequence + "-original-" + target.filename),
            preview: TestPaths.tmpPath("all-" + sequence + "-preview-" + target.filename)
        }));
        targets.forEach(target => writeText(target.path, "original-" + target.state));
        createController();
    }

    function cleanup() { controller.destroy(); }

    function writeAll() {
        controller.writeAllOnce();
        tryVerify(() => !controller.busy);
    }

    function test_allWritesWaitForEveryVerifiedBackupAndRestoreAfterRestart() {
        writeAll();
        compare(writes, 7);
        targets.forEach(target => {
            compare(Storage.readFile(target.path), "test-" + target.state);
            compare(Storage.readFile(target.backup), "original-" + target.state);
        });
        controller.destroy();
        createController();
        writeAll();
        compare(writes, 14);
        controller.canRender = false;
        controller.restoreAll();
        tryVerify(() => !controller.busy);
        targets.forEach(target => compare(Storage.readFile(target.path), "original-" + target.state));
        compare(writes, 21);
    }

    function test_singleSuspendBackupIsReusedByAllScreens() {
        writeText(targets[0].preview, "single suspend preview");
        controller.writeOnce();
        tryVerify(() => !controller.busy);
        writeAll();
        compare(Storage.readFile(targets[0].backup), "original-sleep");
        controller.restoreAll();
        tryVerify(() => !controller.busy);
        compare(Storage.readFile(targets[0].path), "original-sleep");
    }

    function test_failedRenderNeverWritesDeviceOrBackups() {
        renderSucceeds = false;
        writeAll();
        compare(writes, 0);
        targets.forEach(target => compare(Storage.readBinary(target.backup), null));
    }

    function test_lateBackupFailurePreventsEveryDeviceWrite() {
        targets[6].backup = TestPaths.tmpPath("absent-directory/original.png");
        writeAll();
        compare(writes, 0);
        verify(controller.statusText.includes(targets[6].path));
        targets.forEach(target => compare(Storage.readFile(target.path), "original-" + target.state));
    }

    function test_missingVerifiedBackupIsNotReplaced() {
        writeText(targets[3].backup + ".verified", "true");
        writeAll();
        compare(writes, 0);
        compare(Storage.readBinary(targets[3].backup), null);
        verify(controller.statusText.includes(targets[3].backup));
    }

    function test_partialWriteCanRestoreEveryOriginal() {
        failingPath = targets[3].path;
        writeAll();
        compare(writes, 4);
        verify(controller.statusText.includes(failingPath));
        failingPath = "";
        controller.restoreAll();
        tryVerify(() => !controller.busy);
        targets.forEach(target => compare(Storage.readFile(target.path), "original-" + target.state));
    }

    function test_restorePreflightsEveryBackup() {
        writeAll();
        writeText(targets[6].backup + ".verified", "false");
        writes = 0;
        controller.restoreAll();
        compare(writes, 0);
        verify(controller.statusText.includes(targets[6].backup));
    }

    function test_absentOptionalScreensAreSkipped() {
        targets.slice(3).forEach(target => target.path += ".absent");
        writeAll();
        compare(writes, 3);
        targets.slice(3).forEach(target => compare(Storage.readBinary(target.backup), null));
    }

    function test_disabledUnreadableAndBusyActionsDoNotWrite() {
        controller.enabled = false;
        controller.writeAllOnce();
        controller.restoreAll();
        compare(renders, 0);
        controller.enabled = true;
        controller.canRender = false;
        controller.writeAllOnce();
        compare(renders, 0);
        controller.canRender = true;
        controller.writeAllOnce();
        controller.writeAllOnce();
        controller.restoreAll();
        controller.writeOnce();
        tryVerify(() => !controller.busy);
        compare(renders, 1);
        compare(writes, 7);
    }

    function test_restoreWithoutBackupsDoesNotWrite() {
        controller.restoreAll();
        compare(writes, 0);
        verify(controller.statusText.includes("No original"));
    }

    function test_defaultWriterRejectsNonScreenPaths() {
        const restricted = createTemporaryObject(factory, testCase, {});
        let result = null;
        restricted.writeDeviceTarget(TestPaths.tmpPath("forbidden-device.png"), new ArrayBuffer(1), error => result = error);
        verify(result.includes("Refusing unsupported screen"));
        compare(Storage.readBinary(TestPaths.tmpPath("forbidden-device.png")), null);
    }
}
