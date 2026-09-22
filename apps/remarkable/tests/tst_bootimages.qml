import QtQuick 2.15
import QtTest 1.2
import "../src/components" as Components
import "../src/js/BootSplash.js" as BootSplash
import "../src/js/Storage.js" as Storage
import "../src/js/HabitsModel.js" as HabitsModel
import "Fixtures.js" as Fixtures
import "TestPaths.js" as TestPaths

TestCase {
    id: testCase
    name: "BootImages"
    when: windowShown

    readonly property string directory: TestPaths.tmpPath("boot-images")
    readonly property var pngNames: ["suspended.png", "poweroff.png", "batteryempty.png", "starting.png", "rebooting.png", "overheating.png", "restart-crashed.png"]
    readonly property var bootPaths: [directory + "/system/splash/splash.bmp", directory + "/uboot/splash.bmp"]
    property var originalBoot: null
    property var writer: null

    Component { id: factory; Components.SuspendCanvas {} }

    function writeBinary(path, buffer) {
        let finished = false;
        Storage.writeBinary(path, buffer, error => { compare(error, null); finished = true; });
        tryVerify(() => finished);
    }

    function writeText(path, text) {
        let finished = false;
        Storage.writeFile(path, text, error => { compare(error, null); finished = true; });
        tryVerify(() => finished);
    }

    function initTestCase() {
        originalBoot = BootSplash.encodeLandscape(new Uint8Array(1872 * 1404 * 4), 1872, 1404);
    }

    function init() {
        pngNames.forEach(name => writeText(directory + "/system/" + name, "test-image-" + name));
        bootPaths.forEach(path => writeBinary(path, originalBoot));
        writer = createTemporaryObject(factory, testCase, {
            imageDirectory: directory + "/system",
            bootImageDirectory: directory + "/uboot",
            bootBackupDirectory: directory,
            deviceModel: "reMarkable 1.0",
            signaturePath: directory + "/signature.json",
            habits: Fixtures.fakeModel([Fixtures.habitRow()]),
            today: new Date(2026, 8, 22)
        });
        verify(writer !== null);
        tryVerify(() => writer.available);
    }

    function cleanup() {
        writer.renderAllowed = false;
    }

    function verifyPngsUnchanged() {
        pngNames.forEach(name => compare(Storage.readFile(directory + "/system/" + name), "test-image-" + name));
    }

    function test_wrongDevicePreventsAllWrites() {
        writer.deviceModel = "reMarkable 2.0";
        writer.renderAllowed = true;
        writer.renderAsync();
        compare(writer.phase, "backup-failed");
        compare(writer.failedPath, bootPaths[0]);
        verifyPngsUnchanged();
    }

    function test_invalidOriginalPreventsAllWrites() {
        writeText(bootPaths[1], "invalid boot bitmap");
        writer.renderAllowed = true;
        writer.renderAsync();
        compare(writer.phase, "backup-failed");
        compare(writer.failedPath, bootPaths[1]);
        verifyPngsUnchanged();
    }

    function test_failedBootBackupPreventsAllWrites() {
        const boot = writer.targets.find(target => target.format === "boot-bmp");
        verify(boot !== undefined);
        boot.backup = directory + "/absent-directory/boot.bmp";
        writer.renderAllowed = true;
        writer.renderAsync();
        tryCompare(writer, "phase", "backup-failed", 15000);
        verifyPngsUnchanged();
    }

    function test_invalidBackupPreventsEveryRestore() {
        let backedUp = false;
        writer.backup(ok => backedUp = ok);
        tryVerify(() => backedUp, 15000);
        const boot = writer.targets.filter(target => target.format === "boot-bmp")[1];
        writeText(boot.backup, "invalid backup");
        let restored = null;
        writer.restore(ok => restored = ok);
        compare(restored, false);
        compare(writer.phase, "restore-failed");
        compare(writer.failedPath, boot.backup);
        verifyPngsUnchanged();
        writeBinary(boot.backup, originalBoot);
    }

    function test_failedBootWriteKeepsSignatureDirtyUntilRetry() {
        let backedUp = false;
        writer.backup(ok => backedUp = ok);
        tryVerify(() => backedUp, 15000);
        writer.lastRenderedSignature = "";
        const boot = writer.targets.filter(target => target.format === "boot-bmp")[1];
        const correctPath = boot.path;
        boot.path = directory + "/absent-directory/boot.bmp";
        writer.renderAllowed = true;
        writer.renderAsync();
        tryCompare(writer, "phase", "save-failed", 15000);
        compare(writer.failedPath, boot.path);
        compare(writer.lastRenderedSignature, "");
        verify(!writer.busy);

        boot.path = correctPath;
        writer.renderAsync();
        tryCompare(writer, "phase", "saved", 15000);
        verify(writer.lastRenderedSignature.length > 0);
        compare(BootSplash.validationError(Storage.readBinary(correctPath)), "");
    }

    function test_regularRenderReplacesBootAndStartupImagesAndRestoresOriginals() {
        writer.lastRenderedSignature = writer._signature(HabitsModel.toSuspendHabits(writer.habits), writer.today);
        writer.renderAllowed = true;
        writer.renderAsync();
        tryCompare(writer, "phase", "saved", 15000);
        // A success message must include the early-boot files, not just the three legacy PNGs.
        bootPaths.forEach(path => {
            const bytes = Storage.readBinary(path);
            compare(BootSplash.validationError(bytes), "");
            verify(new Uint8Array(bytes).slice(1078).some(pixel => pixel < 20), path + " still contains the old blank BMP");
        });
        pngNames.forEach(name => compare(new Uint8Array(Storage.readBinary(directory + "/system/" + name))[0], 137, name));
        let restored = null;
        writer.restore(ok => restored = ok);
        tryVerify(() => restored !== null, 15000);
        compare(restored, true);
        const originalBytes = new Uint8Array(originalBoot);
        bootPaths.forEach(path => verify(new Uint8Array(Storage.readBinary(path)).every((value, index) => value === originalBytes[index])));
        pngNames.forEach(name => compare(Storage.readFile(directory + "/system/" + name), "test-image-" + name));
    }
}
