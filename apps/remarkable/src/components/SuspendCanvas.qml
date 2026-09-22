import QtQuick 2.15
import "../js/SuspendRender.js" as SuspendRender
import "../js/SuspendDraw.js" as SuspendDraw
import "../js/HabitsModel.js" as HabitsModel
import "../js/BuildProfile.js" as BuildProfile
import "../js/BootSplash.js" as BootSplash
import "../js/Storage.js" as Storage

Canvas {
    id: canvas

    property string imageDirectory: "/usr/share/remarkable"
    property string bootImageDirectory: "/var/lib/uboot"
    property string bootBackupDirectory: BuildProfile.appDirectory
    property string deviceModel: BuildProfile.isTest ? "" : Storage.readFile("/sys/devices/soc0/machine").trim()
    property string signaturePath: BuildProfile.signaturePath
    property string targetPath: BuildProfile.suspendPath
    property var _selectedTargets: null
    readonly property var targets: _selectedTargets || (BuildProfile.isTest
        ? [{ state: "sleep", path: canvas.targetPath, backup: BuildProfile.suspendBackupPath }]
        : SuspendRender.imageTargets(imageDirectory)
            .concat(BootSplash.imageTargets(bootBackupDirectory, imageDirectory, bootImageDirectory)))
    property var habits: []
    property date today: new Date()
    property bool renderAllowed: false
    property bool lastRenderFailed: false
    property string failedPath: ""
    property string phase: ""
    property int remainingSeconds: 0
    property string lastRenderedSignature: ""
    property bool busy: false
    property bool restorationPending: false
    property bool _backupsReady: BuildProfile.isTest
    property bool _renderedThisSession: false
    property int _generation: 0
    property var _batch: null

    width: 1404
    height: 1872
    x: -2000
    visible: true
    renderStrategy: Canvas.Cooperative
    renderTarget: Canvas.Image

    Component.onCompleted: canvas.lastRenderedSignature = SuspendRender.readSignature(canvas.signaturePath)
    onRenderAllowedChanged: if (!renderAllowed) cancelPending()

    BootCanvas { id: bootCanvas }

    Timer {
        id: debounceTimer
        interval: 3000
        repeat: false
        onTriggered: canvas.renderAsync()
    }

    Timer {
        id: statusTickTimer
        interval: 1000
        repeat: true
        onTriggered: canvas.remainingSeconds = Math.max(0, canvas.remainingSeconds - 1)
    }

    Timer {
        id: imageTimer
        interval: 32
        repeat: false
        onTriggered: canvas._renderNextImage()
    }

    function scheduleRender() {
        if (!renderAllowed || restorationPending || busy)
            return;
        if (_backupsReady && _upToDate()) {
            cancelPending();
            return;
        }
        canvas.phase = "pending";
        canvas.remainingSeconds = 3;
        debounceTimer.restart();
        statusTickTimer.restart();
    }

    function renderAsync() {
        if (!renderAllowed || restorationPending || busy)
            return;
        if (_backupsReady && _upToDate()) {
            cancelPending();
            return;
        }
        debounceTimer.stop();
        statusTickTimer.stop();
        if (canvas._backupsReady) {
            canvas.phase = "saving";
            Qt.callLater(canvas._renderAll);
            return;
        }
        const generation = canvas._generation;
        backup(ok => {
            if (!ok || generation !== canvas._generation || !canvas.renderAllowed || canvas.restorationPending)
                return;
            if (_upToDate()) {
                canvas.phase = "saved";
                return;
            }
            canvas.phase = "saving";
            Qt.callLater(canvas._renderAll);
        });
    }

    function renderOnce(onDone) {
        renderImagesOnce([{ state: "sleep", path: canvas.targetPath }], onDone);
    }

    function renderImagesOnce(imageTargets, onDone, snapshot = HabitsModel.toSuspendHabits(canvas.habits), snapshotDate = new Date(canvas.today.getTime())) {
        if (canvas.busy) {
            onDone(false);
            return;
        }
        canvas.cancelPending();
        canvas.busy = true;
        canvas.phase = "saving";
        _renderImages(imageTargets, snapshot, snapshotDate, (ok, path) => {
            canvas._finishRender(ok, path);
            onDone(ok, path);
        });
    }

    function _renderImages(imageTargets, snapshot, date, onDone, synchronous = false) {
        if (synchronous) {
            const failed = imageTargets.find(target => !canvas._renderTarget(target, snapshot, date));
            onDone(!failed, failed ? failed.path : "");
            return;
        }
        canvas._batch = {
            targets: imageTargets.map(target => Object.assign({}, target)),
            snapshot: snapshot, date: date, onDone: onDone, index: 0
        };
        imageTimer.start();
    }

    function _renderNextImage() {
        const batch = canvas._batch;
        if (batch.index === batch.targets.length) {
            canvas._batch = null;
            batch.onDone(true, "");
            return;
        }
        const target = batch.targets[batch.index++];
        if (!canvas._renderTarget(target, batch.snapshot, batch.date)) {
            canvas._batch = null;
            batch.onDone(false, target.path);
            return;
        }
        imageTimer.restart();
    }

    function _finishRender(ok, path) {
        canvas.busy = false;
        canvas.lastRenderFailed = !ok;
        canvas.failedPath = path;
        canvas.phase = ok ? "saved" : "save-failed";
    }

    function _renderTarget(target, snapshot, date) {
        SuspendDraw.draw(canvas.getContext("2d"), canvas.width, canvas.height, snapshot, date, { fg: "#000000", bg: "#ffffff" }, target.state);
        return BuildProfile.canWrite(target.path) && canvas.save(target.path);
    }

    function renderSync() {
        // Boot writes need asynchronous readback; the normal Quit path waits for that batch.
        if (busy || !_backupsReady || canvas.targets.some(target => target.format === "boot-bmp"))
            return;
        _renderAll(true);
    }

    function cancelPending() {
        canvas._generation++;
        debounceTimer.stop();
        statusTickTimer.stop();
        if (canvas.phase === "pending" || (canvas.phase === "saving" && !canvas.busy))
            canvas.phase = "";
    }

    function backup(onDone) {
        if (busy) {
            onDone(false);
            return;
        }
        canvas.busy = true;
        canvas.phase = "backing-up";
        _withTargets(targets => SuspendRender.backupImages(targets, (ok, path) => {
            canvas.busy = false;
            canvas._backupsReady = ok;
            canvas.failedPath = path;
            canvas.lastRenderFailed = !ok;
            canvas.phase = ok ? "backed-up" : "backup-failed";
            onDone(ok);
        }, canvas.deviceModel));
    }

    function _withTargets(onDone) {
        if (canvas._selectedTargets) {
            onDone(canvas.targets);
            return;
        }
        SuspendRender.availableImageTargets(canvas.targets, targets => {
            canvas._selectedTargets = targets;
            onDone(targets);
        });
    }

    function restore(onDone) {
        if (busy) {
            if (onDone) onDone(false);
            return;
        }
        cancelPending();
        canvas.restorationPending = true;
        canvas._renderedThisSession = false;
        canvas.busy = true;
        canvas.phase = "restoring";
        _withTargets(targets => SuspendRender.restoreImages(targets, (ok, path) => {
            if (!ok) {
                _finishRestore(false, path, onDone);
                return;
            }
            invalidateSignature(saved => _finishRestore(saved, saved ? "" : canvas.signaturePath, onDone));
        }, canvas.deviceModel));
    }

    function _finishRestore(ok, path, onDone) {
        canvas.busy = false;
        canvas.failedPath = path;
        canvas.lastRenderFailed = !ok;
        canvas.phase = ok ? "restored" : "restore-failed";
        if (onDone) onDone(ok);
    }

    function invalidateSignature(onDone) {
        canvas.lastRenderedSignature = "";
        SuspendRender.writeSignature(canvas.signaturePath, "", onDone);
    }

    function _upToDate() {
        // Developer writes and OS updates can replace the images between app launches.
        return canvas._renderedThisSession
            && _signature(HabitsModel.toSuspendHabits(canvas.habits), canvas.today) === canvas.lastRenderedSignature;
    }

    function _signature(snapshot, date) {
        return SuspendDraw.computeSignature(snapshot, date) + "\n" + canvas.targets.map(target => target.path).join("\n");
    }

    function _renderAll(synchronous = false) {
        if (!renderAllowed || restorationPending || busy || !_backupsReady || _upToDate())
            return;

        canvas.phase = "saving";
        canvas.busy = true;
        const snapshot = HabitsModel.toSuspendHabits(canvas.habits);
        canvas._renderedThisSession = false;
        const snapshotDate = new Date(canvas.today.getTime());
        const signature = _signature(snapshot, snapshotDate);
        SuspendRender.invalidBootPath(canvas.targets, canvas.deviceModel, invalid => {
            if (invalid) canvas._fail("save-failed", invalid);
            else canvas._renderSnapshot(snapshot, snapshotDate, signature, synchronous);
        });
    }

    function _renderSnapshot(snapshot, date, signature, synchronous) {
        const pngTargets = canvas.targets.filter(target => target.format !== "boot-bmp");
        _renderImages(pngTargets, snapshot, date, (ok, path) => {
            if (!ok) {
                canvas._fail("save-failed", path);
                return;
            }
            const bootTargets = canvas.targets.filter(target => target.format === "boot-bmp");
            bootCanvas.renderImages(bootTargets, snapshot, date, (saved, failedPath) => {
                if (!saved) canvas._fail("save-failed", failedPath);
                else canvas._saveSignature(signature);
            });
        }, synchronous);
    }

    function _fail(phase, path) {
        canvas.busy = false;
        canvas._renderedThisSession = false;
        canvas.failedPath = path;
        canvas.lastRenderFailed = true;
        canvas.phase = phase;
    }

    function _saveSignature(signature) {
        SuspendRender.writeSignature(canvas.signaturePath, signature, ok => {
            canvas._finishRender(ok, ok ? "" : canvas.signaturePath);
            if (!ok) return;
            canvas.lastRenderedSignature = signature;
            canvas._renderedThisSession = true;
            if (canvas.renderAllowed && !canvas._upToDate()) canvas.scheduleRender();
        });
    }
}
