import QtQuick 2.15
import "../js/SuspendDraw.js" as SuspendDraw
import "../js/HabitsModel.js" as HabitsModel
import "../js/BuildProfile.js" as BuildProfile
import "../js/SuspendRender.js" as SuspendRender

Canvas {
    id: canvas
    property string targetPath: BuildProfile.suspendPath
    property var habits: []
    property var suppliedSnapshot: null
    property date today: new Date()
    property bool busy: false
    property bool lastRenderFailed: false
    property string failedPath: ""
    property string phase: ""
    property var _batch: null

    width: 1404
    height: 1872
    x: -2000
    visible: true
    renderStrategy: Canvas.Cooperative
    renderTarget: Canvas.Image

    signal imageSaved(string path)

    Timer {
        id: imageTimer
        interval: 32
        onTriggered: canvas._renderNextImage()
    }

    function _snapshot() {
        return suppliedSnapshot !== null ? suppliedSnapshot : HabitsModel.toSuspendHabits(canvas.habits);
    }

    function renderOnce(onDone) {
        renderImagesOnce([{ state: "sleep", path: canvas.targetPath }], onDone);
    }

    function renderImagesOnce(imageTargets, onDone, snapshot = canvas._snapshot(), snapshotDate = new Date(canvas.today.getTime())) {
        if (canvas.busy) {
            onDone(false);
            return;
        }
        canvas.busy = true;
        canvas.phase = "saving";
        _renderImages(imageTargets, snapshot, snapshotDate, (ok, path) => {
            canvas._finishRender(ok, path);
            onDone(ok, path);
        });
    }

    function _renderImages(imageTargets, snapshot, date, onDone) {
        canvas._batch = {
            targets: imageTargets.map(target => Object.assign({}, target)),
            snapshot: snapshot, date: date, onDone: onDone, index: 0, baseDrawn: false, savedStates: ({})
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
        const savedPath = batch.savedStates[target.state];
        if (savedPath) {
            SuspendRender.copyFile(savedPath, target.path, ok => canvas._finishImage(batch, target, ok));
            return;
        }
        canvas._finishImage(batch, target, canvas._renderTarget(target, batch.snapshot, batch.date));
    }

    function _finishImage(batch, target, ok) {
        if (!ok) {
            canvas._batch = null;
            batch.onDone(false, target.path);
            return;
        }
        batch.savedStates[target.state] = target.path;
        canvas.imageSaved(target.path);
        imageTimer.restart();
    }

    function _finishRender(ok, path) {
        canvas.busy = false;
        canvas.lastRenderFailed = !ok;
        canvas.failedPath = path;
        canvas.phase = ok ? "saved" : "save-failed";
    }

    function _renderTarget(target, snapshot, date) {
        const context = canvas.getContext("2d");
        const colors = { fg: "#000000", bg: "#ffffff" };
        if (!canvas._batch.baseDrawn) {
            SuspendDraw.drawBase(context, canvas.width, canvas.height, snapshot, date, colors);
            canvas._batch.baseDrawn = true;
        }
        SuspendDraw.drawState(context, canvas.width, canvas.height, colors, target.state);
        return BuildProfile.canWrite(target.path) && canvas.save(target.path);
    }
}
