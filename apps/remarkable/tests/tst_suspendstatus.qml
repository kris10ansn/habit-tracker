import QtQuick 2.15
import QtTest 1.2
import "../src/js/SuspendStatus.js" as SuspendStatus

TestCase {
    name: "SuspendStatus"

    function test_pendingCountsDown() {
        compare(SuspendStatus.text("pending", 5), "Saving power-state images in 5s");
        compare(SuspendStatus.text("pending", 1), "Saving power-state images in 1s");
    }

    // At zero the countdown has run out and the save is starting, so it reads as in-progress
    // rather than "in 0s".
    function test_pendingAtZeroReadsAsInProgress() {
        compare(SuspendStatus.text("pending", 0), "Saving power-state images...");
    }

    function test_savingNamesCurrentImageAndRemainingCount() {
        compare(SuspendStatus.text("saving", 0, "", { path: "/usr/share/remarkable/poweroff.png", remainingImages: 7 }), "Saving poweroff.png (7 left)");
        compare(SuspendStatus.text("saving", 0, "", { path: "/usr/share/remarkable/splash/splash.bmp", remainingImages: 1 }), "Saving splash/splash.bmp (1 left)");
        compare(SuspendStatus.text("saving", 0, "", { path: "/var/lib/uboot/splash.bmp", remainingImages: 0 }), "Saving uboot/splash.bmp (0 left)");
    }

    function test_everyPhaseHasALabel() {
        const phases = ["saving", "saved", "backing-up", "backed-up", "restoring", "restored", "backup-failed", "restore-failed", "save-failed"];

        phases.forEach(phase => verify(SuspendStatus.text(phase, 0).length > 0, `no label for ${phase}`));
    }

    function test_failureNamesTheAffectedImage() {
        compare(SuspendStatus.text("save-failed", 0, "/usr/share/remarkable/poweroff.png"), "Could not save power-state images: /usr/share/remarkable/poweroff.png");
    }

    function test_unknownPhaseIsSilent() {
        compare(SuspendStatus.text("", 0), "");
        compare(SuspendStatus.text("nonsense", 0), "");
    }
}
