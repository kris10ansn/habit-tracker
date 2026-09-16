import QtQuick 2.15
import "../js/SuspendRender.js" as SuspendRender
import "../js/SuspendDraw.js" as SuspendDraw
import "../js/HabitsModel.js" as HabitsModel

Canvas {
    id: canvas

    property string imageDirectory: "/usr/share/remarkable"
    property string signaturePath: "/home/root/xovi/exthome/appload/habit-tracker/.sleep-sig"
    readonly property var targets: SuspendRender.imageTargets(imageDirectory)
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
    property bool _backupsReady: false
    property int _generation: 0

    width: 1404
    height: 1872
    x: -2000
    visible: true
    renderStrategy: Canvas.Cooperative
    renderTarget: Canvas.Image

    Component.onCompleted: canvas.lastRenderedSignature = SuspendRender.readSignature(canvas.signaturePath)
    onRenderAllowedChanged: if (!renderAllowed) cancelPending()

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

    function renderSync() {
        // Unloading cannot wait for asynchronous backup writes. Normal startup prepares these.
        if (busy || !_backupsReady)
            return;
        _renderAll();
    }

    function cancelPending() {
        canvas._generation++;
        debounceTimer.stop();
        statusTickTimer.stop();
        if (canvas.phase === "pending" || canvas.phase === "saving")
            canvas.phase = "";
    }

    function backup(onDone) {
        if (busy) {
            onDone(false);
            return;
        }
        canvas.busy = true;
        canvas.phase = "backing-up";
        SuspendRender.backupImages(canvas.targets, (ok, path) => {
            canvas.busy = false;
            canvas._backupsReady = ok;
            canvas.failedPath = path;
            canvas.lastRenderFailed = !ok;
            canvas.phase = ok ? "backed-up" : "backup-failed";
            onDone(ok);
        });
    }

    function restore(onDone) {
        if (busy) {
            if (onDone) onDone(false);
            return;
        }
        cancelPending();
        canvas.restorationPending = true;
        canvas.busy = true;
        canvas.phase = "restoring";
        SuspendRender.restoreImages(canvas.targets, (ok, path) => {
            if (!ok) {
                _finishRestore(false, path, onDone);
                return;
            }
            invalidateSignature(saved => _finishRestore(saved, saved ? "" : canvas.signaturePath, onDone));
        });
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
        return SuspendDraw.computeSignature(HabitsModel.toSuspendHabits(canvas.habits), canvas.today) === canvas.lastRenderedSignature;
    }

    function _renderAll() {
        if (!renderAllowed || restorationPending || busy || !_backupsReady || _upToDate())
            return;

        canvas.phase = "saving";
        canvas.busy = true;
        const snapshot = HabitsModel.toSuspendHabits(canvas.habits);
        const snapshotDate = new Date(canvas.today.getTime());
        const signature = SuspendDraw.computeSignature(snapshot, snapshotDate);
        const context = canvas.getContext("2d");
        for (let index = 0; index < canvas.targets.length; index++) {
            const target = canvas.targets[index];
            SuspendDraw.draw(context, canvas.width, canvas.height, snapshot, snapshotDate, { fg: "#000000", bg: "#ffffff" }, target.state);
            if (!canvas.save(target.path)) {
                canvas.busy = false;
                canvas.failedPath = target.path;
                canvas.lastRenderFailed = true;
                canvas.phase = "save-failed";
                return;
            }
        }
        SuspendRender.writeSignature(canvas.signaturePath, signature, ok => {
            canvas.busy = false;
            canvas.lastRenderFailed = !ok;
            canvas.failedPath = ok ? "" : canvas.signaturePath;
            canvas.phase = ok ? "saved" : "save-failed";
            if (!ok) return;
            canvas.lastRenderedSignature = signature;
            if (canvas.renderAllowed && !canvas._upToDate()) canvas.scheduleRender();
        });
    }
}
