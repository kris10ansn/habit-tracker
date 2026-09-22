import QtQuick 2.15
import "../js/SuspendDraw.js" as SuspendDraw
import "../js/HabitsModel.js" as HabitsModel
import "../js/BuildProfile.js" as BuildProfile

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
        SuspendDraw.draw(canvas.getContext("2d"), canvas.width, canvas.height, snapshot, date, { fg: "#000000", bg: "#ffffff" }, target.state);
        return BuildProfile.canWrite(target.path) && canvas.save(target.path);
    }
}
