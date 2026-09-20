import QtQuick 2.15
import QtTest 1.2
import "../src/components" as Components
import "../src/js/SuspendRender.js" as SuspendRender
import "../src/js/Storage.js" as Storage
import "TestPaths.js" as TestPaths
import "Fixtures.js" as Fixtures

TestCase {
    id: testCase
    name: "PowerImages"
    when: windowShown
    width: 100
    height: 100

    Component { id: writerComponent; Components.SuspendCanvas {} }

    function writeFile(path, content) {
        let finished = false;
        Storage.writeFile(path, content, error => { verify(!error); finished = true; });
        tryVerify(() => finished);
    }

    function targets(prefix) {
        return SuspendRender.imageTargets(TestPaths.tmpDir()).map(target => Object.assign({}, target, {
            path: TestPaths.tmpPath(`${prefix}-${target.filename}`),
            backup: TestPaths.tmpPath(`${prefix}-${target.filename}.bak`)
        }));
    }

    function seed(targets) {
        targets.forEach(target => writeFile(target.path, `original-${target.state}`));
    }

    function test_backupPreservesOriginalsAcrossRetriesAndReenable() {
        const images = targets("backups");
        seed(images);
        let result = null;
        SuspendRender.backupImages(images, ok => result = ok);
        tryVerify(() => result === true);
        images.forEach(target => writeFile(target.path, `custom-${target.state}`));
        result = null;
        SuspendRender.backupImages(images, ok => result = ok);
        tryVerify(() => result === true);
        images.forEach(target => compare(Storage.readFile(target.backup), `original-${target.state}`));
        result = null;
        SuspendRender.restoreImages(images, ok => result = ok);
        tryVerify(() => result === true);
        images.forEach(target => compare(Storage.readFile(target.path), `original-${target.state}`));
    }

    function test_upgradeKeepsTheSuspendBackup() {
        const images = targets("upgrade");
        seed(images);
        writeFile(images[0].backup, "original-sleep-before-upgrade");
        writeFile(images[0].path, "old-custom-suspend");
        let result = null;
        SuspendRender.backupImages(images, ok => result = ok);
        tryVerify(() => result === true);
        compare(Storage.readFile(images[0].backup), "original-sleep-before-upgrade");
        compare(Storage.readFile(images[1].backup), "original-off");
        compare(Storage.readFile(images[2].backup), "original-empty");
    }

    function test_missingSourcePreventsBackupSuccess() {
        const images = targets("missing");
        writeFile(images[0].path, "original-sleep");
        let result = null;
        let failedPath = "";
        SuspendRender.backupImages(images, (ok, path) => { result = ok; failedPath = path; });
        tryVerify(() => result === false);
        compare(failedPath, images[1].path);
        compare(Storage.readFile(images[0].path), "original-sleep");
    }

    function test_unwritableBackupPreventsSuccess() {
        const images = targets("unwritable");
        seed(images);
        images[1].backup = TestPaths.tmpPath("absent-directory/off.png.bak");
        let result = null;
        SuspendRender.backupImages(images, ok => result = ok);
        tryVerify(() => result === false);
        images.forEach(target => compare(Storage.readFile(target.path), `original-${target.state}`));
    }

    function test_restorePreflightsEveryBackup() {
        const images = targets("restore-missing");
        seed(images);
        writeFile(images[0].backup, "restore-sleep");
        let result = null;
        SuspendRender.restoreImages(images, ok => result = ok);
        compare(result, false);
        compare(Storage.readFile(images[0].path), "original-sleep");
    }

    function createWriter() {
        const writer = writerComponent.createObject(testCase, {
            imageDirectory: TestPaths.tmpPath("power-images"),
            signaturePath: TestPaths.tmpPath("power-images-signature.json"),
            habits: Fixtures.fakeModel([Fixtures.habitRow()]),
            today: new Date(2026, 8, 9)
        });
        verify(writer !== null);
        tryVerify(() => writer.available);
        return writer;
    }

    function test_canvasWritesThreeDistinctPngsAndRestores() {
        const writer = createWriter();
        seed(writer.targets);
        writer.renderAllowed = true;
        writer.renderAsync();
        tryCompare(writer, "phase", "saved", 10000);
        const images = writer.targets.map(target => Storage.readBinary(target.path));
        images.forEach(buffer => {
            verify(buffer.byteLength > 100);
            compare(new Uint8Array(buffer)[0], 137);
        });
        verify(images[0].byteLength !== images[1].byteLength);
        verify(images[1].byteLength !== images[2].byteLength);
        verify(writer.lastRenderedSignature.length > 0);
        let result = null;
        writer.restore(ok => result = ok);
        tryVerify(() => result === true);
        writer.targets.forEach(target => compare(Storage.readFile(target.path), `original-${target.state}`));
        compare(writer.lastRenderedSignature, "");
        writer.renderAllowed = false;
        writer.destroy();
    }

    function test_cancelDuringBackupPreventsWrites() {
        const writer = createWriter();
        seed(writer.targets);
        writer.lastRenderedSignature = "";
        writer.renderAllowed = true;
        writer.renderAsync();
        writer.renderAllowed = false;
        tryVerify(() => !writer.busy);
        wait(50);
        writer.targets.forEach(target => compare(Storage.readFile(target.path), `original-${target.state}`));
        compare(writer.lastRenderedSignature, "");
        writer.destroy();
    }

    function test_failedSaveLeavesSignatureDirtyAndCanRetry() {
        const writer = createWriter();
        seed(writer.targets);
        let backedUp = false;
        writer.backup(ok => backedUp = ok);
        tryVerify(() => backedUp);
        writer.lastRenderedSignature = "";
        const correctPath = writer.targets[1].path;
        writer.targets[1].path = TestPaths.tmpPath("absent-directory/poweroff.png");
        writer.renderAllowed = true;
        writer.renderAsync();
        tryCompare(writer, "phase", "save-failed");
        compare(writer.lastRenderedSignature, "");
        compare(writer.failedPath, writer.targets[1].path);
        writer.targets[1].path = correctPath;
        writer.renderAsync();
        tryCompare(writer, "phase", "saved");
        verify(writer.lastRenderedSignature.length > 0);
        writer.renderAllowed = false;
        writer.destroy();
    }

    function test_failedSignatureWriteReportsFailureAndCanRetry() {
        const writer = createWriter();
        seed(writer.targets);
        writer.lastRenderedSignature = "";
        const correctPath = writer.signaturePath;
        writer.signaturePath = TestPaths.tmpPath("absent-directory/signature.json");
        writer.renderAllowed = true;
        writer.renderAsync();
        tryCompare(writer, "phase", "save-failed");
        compare(writer.busy, false);
        compare(writer.lastRenderedSignature, "");
        compare(writer.failedPath, writer.signaturePath);
        writer.signaturePath = correctPath;
        writer.renderAsync();
        tryCompare(writer, "phase", "saved");
        verify(writer.lastRenderedSignature.length > 0);
        writer.renderAllowed = false;
        writer.destroy();
    }

    function test_failedRestorePausesRenderingUntilRestoreRetried() {
        const writer = createWriter();
        seed(writer.targets);
        let backedUp = false;
        writer.backup(ok => backedUp = ok);
        tryVerify(() => backedUp);
        writer.targets.forEach(target => writeFile(target.path, `custom-${target.state}`));
        const correctPath = writer.targets[1].path;
        writer.targets[1].path = TestPaths.tmpPath("absent-directory/poweroff.png");
        let result = null;
        writer.restore(ok => result = ok);
        tryVerify(() => result === false);
        compare(writer.phase, "restore-failed");
        verify(writer.restorationPending);
        writer.renderAllowed = true;
        writer.renderAsync();
        compare(writer.phase, "restore-failed");
        compare(Storage.readFile(writer.targets[0].path), "original-sleep");
        writer.targets[1].path = correctPath;
        result = null;
        writer.restore(ok => result = ok);
        tryVerify(() => result === true);
        writer.targets.forEach(target => compare(Storage.readFile(target.path), `original-${target.state}`));
        writer.renderAllowed = false;
        writer.destroy();
    }
}
