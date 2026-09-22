import QtQuick 2.15
import QtTest 1.2
import "../src/components" as Components
import "../src/js/SuspendRender.js" as SuspendRender
import "../src/js/SuspendDraw.js" as SuspendDraw
import "../src/js/HabitsModel.js" as HabitsModel
import "../src/js/Storage.js" as Storage
import "TestPaths.js" as TestPaths
import "Fixtures.js" as Fixtures

TestCase {
    id: testCase
    name: "PowerImages"
    when: windowShown
    width: 100
    height: 100

    property var habits: null
    property date today: new Date(2026, 8, 9)
    Component { id: writerComponent; Components.PowerImageJobs {} }

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

    function test_newScreensAreIncludedOnlyWhenReadableOrBackedUp() {
        const images = targets("available");
        const required = images.slice(0, 3);
        let selected = null;
        SuspendRender.availableImageTargets(images, targets => selected = targets);
        tryVerify(() => selected !== null);
        compare(selected, required);
        writeFile(images[3].path, "stock-starting");
        writeFile(images[4].backup, "stock-rebooting");
        selected = null;
        SuspendRender.availableImageTargets(images, targets => selected = targets);
        tryVerify(() => selected !== null);
        compare(selected, images.slice(0, 5));
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

    function test_existingBackupChecksAreAsynchronous() {
        const images = targets("async-backups");
        images.forEach(target => writeFile(target.backup, "original"));
        let result = null;
        SuspendRender.backupImages(images, ok => result = ok);
        compare(result, null, "Backup checks must return control to the UI before completing");
        tryVerify(() => result === true);
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
        images.slice(3).forEach(target => compare(Storage.readFile(target.backup), `original-${target.state}`));
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
        tryVerify(() => result === false);
        compare(Storage.readFile(images[0].path), "original-sleep");
    }

    function createWriter(directory = "power-images") {
        seed(SuspendRender.imageTargets(TestPaths.tmpPath(directory)));
        testCase.habits = Fixtures.fakeModel([Fixtures.habitRow()]);
        const writer = writerComponent.createObject(testCase, {
            imageDirectory: TestPaths.tmpPath(directory),
            signaturePath: TestPaths.tmpPath("power-images-signature.json"),
            targets: SuspendRender.imageTargets(TestPaths.tmpPath(directory))
        });
        verify(writer !== null);
        tryVerify(() => writer.available);
        return writer;
    }

    function test_canvasWritesEveryStateAndRestores_data() {
        return [
            { tag: "separate crash image", directory: "power-images" },
            { tag: "crash image links to reboot", directory: "power-images-linked" }
        ];
    }

    function test_canvasWritesEveryStateAndRestores(data) {
        const writer = createWriter(data.directory);
        compare(writer.targets.map(target => target.filename), ["suspended.png", "poweroff.png", "batteryempty.png", "starting.png", "rebooting.png", "overheating.png", "restart-crashed.png"]);
        seed(writer.targets);
        render(writer);
        tryCompare(writer, "phase", "saved", 10000);
        const images = writer.targets.map(target => Storage.readBinary(target.path));
        images.forEach(buffer => {
            verify(buffer.byteLength > 100);
            compare(new Uint8Array(buffer)[0], 137);
        });
        const bytes = images.map(buffer => Array.from(new Uint8Array(buffer)).join(","));
        for (let index = 1; index < 6; index++) {
            verify(bytes.slice(0, index).every(previous => previous !== bytes[index]));
        }
        compare(bytes[4], bytes[6]);
        verify(writer.lastRenderedSignature.length > 0);
        let result = null;
        writer.restore(ok => result = ok);
        tryVerify(() => result === true);
        writer.targets.forEach(target => compare(Storage.readFile(target.path), `original-${target.state}`));
        compare(writer.lastRenderedSignature, "");
        writer.destroy();
    }

    function render(writer, onDone = function() {}) {
        writer.render(HabitsModel.toSuspendHabits(testCase.habits), testCase.today, onDone);
    }

    function test_capturedJobRejectsOverlapAndCompletesAfterSignature() {
        const writer = createWriter();
        const captured = HabitsModel.toSuspendHabits(testCase.habits);
        const expectedPrefix = SuspendDraw.computeSignature(captured, testCase.today);
        let completions = 0;
        writer.render(captured, testCase.today, (ok, path) => {
            completions++;
            verify(ok);
            compare(path, "");
            verify(!writer.busy);
            verify(SuspendRender.readSignature(writer.signaturePath).indexOf(expectedPrefix) === 0);
            writer.targets.forEach(target => compare(new Uint8Array(Storage.readBinary(target.path))[0], 137));
        });
        captured[0].name = "Changed after capture";
        let overlappingRestore = null;
        writer.restore(ok => overlappingRestore = ok);
        compare(overlappingRestore, false);
        let overlappingRender = null;
        render(writer, ok => overlappingRender = ok);
        compare(overlappingRender, false);
        tryCompare(writer, "phase", "saved", 10000);
        compare(completions, 1);
        wait(50);
        compare(completions, 1);
        writer.destroy();
    }

    function test_upgradeRendersNewScreensWithoutAHabitEdit() {
        const writer = createWriter();
        const oldSignature = SuspendDraw.computeSignature(HabitsModel.toSuspendHabits(testCase.habits), testCase.today).replace("ledger-v5", "ledger-v4");
        writer.lastRenderedSignature = oldSignature;
        render(writer);
        tryCompare(writer, "phase", "saved", 10000);
        verify(writer.lastRenderedSignature !== oldSignature);
        writer.targets.slice(3).forEach(target => compare(new Uint8Array(Storage.readBinary(target.path))[0], 137));
        writer.destroy();
    }

    function test_newScreenBackupFailurePreventsEveryImageWrite() {
        const writer = createWriter();
        writer.targets[3].backup = TestPaths.tmpPath("absent-directory/starting.png.bak");
        render(writer);
        tryCompare(writer, "phase", "backup-failed");
        writer.targets.forEach(target => compare(Storage.readFile(target.path), `original-${target.state}`));
        writer.destroy();
    }

    function test_backupAfterRestoreAllowsAnotherCompleteJob() {
        const writer = createWriter();
        render(writer);
        tryCompare(writer, "phase", "saved", 10000);
        let restored = null;
        writer.restore(ok => restored = ok);
        tryVerify(() => restored === true);
        let blocked = null;
        render(writer, ok => blocked = ok);
        compare(blocked, false);
        let backedUp = null;
        writer.backup(ok => backedUp = ok);
        tryVerify(() => backedUp === true);
        render(writer);
        tryCompare(writer, "phase", "saved", 10000);
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
        render(writer);
        tryCompare(writer, "phase", "save-failed");
        compare(writer.lastRenderedSignature, "");
        compare(writer.failedPath, writer.targets[1].path);
        writer.targets[1].path = correctPath;
        render(writer);
        tryCompare(writer, "phase", "saved");
        verify(writer.lastRenderedSignature.length > 0);
        writer.destroy();
    }

    function test_failedSignatureWriteReportsFailureAndCanRetry() {
        const writer = createWriter();
        seed(writer.targets);
        writer.lastRenderedSignature = "";
        const correctPath = writer.signaturePath;
        writer.signaturePath = TestPaths.tmpPath("absent-directory/signature.json");
        render(writer);
        tryCompare(writer, "phase", "save-failed");
        compare(writer.busy, false);
        compare(writer.lastRenderedSignature, "");
        compare(writer.failedPath, writer.signaturePath);
        writer.signaturePath = correctPath;
        render(writer);
        tryCompare(writer, "phase", "saved");
        verify(writer.lastRenderedSignature.length > 0);
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
        render(writer);
        compare(writer.phase, "restore-failed");
        compare(Storage.readFile(writer.targets[0].path), "original-sleep");
        writer.targets[1].path = correctPath;
        result = null;
        writer.restore(ok => result = ok);
        tryVerify(() => result === true);
        writer.targets.forEach(target => compare(Storage.readFile(target.path), `original-${target.state}`));
        writer.destroy();
    }
}
