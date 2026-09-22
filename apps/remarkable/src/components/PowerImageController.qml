import QtQuick 2.15
import "../js/HabitsModel.js" as HabitsModel
import "../js/SuspendDraw.js" as SuspendDraw
import "../js/DateUtils.js" as DateUtils

Item {
    id: controller
    property var backend: null
    property var habits: null
    property date today: new Date()
    property bool renderAllowed: false
    readonly property bool busy: !!backend && backend.busy
    property bool restorationPending: false
    property string phase: ""
    property string failedPath: ""
    property int remainingSeconds: 0
    property string lastRenderedSignature: ""
    property bool _renderRequested: false

    onRenderAllowedChanged: if (!renderAllowed) cancelPending()
    onBusyChanged: if (!busy && _renderRequested) Qt.callLater(controller.scheduleRender)
    Connections {
        target: controller.backend
        function onFailed(message) {
            controller.failedPath = message;
            controller.phase = "save-failed";
        }
        function onProgress(operation, phase, message) {
            if (operation === "render" && phase) controller.phase = phase;
        }
    }
    Timer { id: debounce; interval: 3000; onTriggered: controller.renderAsync() }
    Timer { id: countdown; interval: 1000; repeat: true; onTriggered: controller.remainingSeconds = Math.max(0, controller.remainingSeconds - 1) }

    function snapshot() {
        return HabitsModel.toSuspendHabits(habits).filter(habit => !habit.isPrivate);
    }
    function upToDate() { return SuspendDraw.computeSignature(snapshot(), today) === lastRenderedSignature; }
    function cancelPending() {
        debounce.stop();
        countdown.stop();
        _renderRequested = false;
        if (phase === "pending") phase = "";
    }
    function scheduleRender() {
        if (!renderAllowed || restorationPending) return;
        if (busy) { _renderRequested = true; return; }
        if (upToDate()) { cancelPending(); return; }
        _renderRequested = false;
        phase = "pending";
        remainingSeconds = 3;
        debounce.restart();
        countdown.restart();
    }
    function renderAsync() {
        if (!renderAllowed || restorationPending) return;
        if (busy) { _renderRequested = true; return; }
        if (upToDate()) { cancelPending(); return; }
        cancelPending();
        const captured = snapshot();
        const signature = SuspendDraw.computeSignature(captured, today);
        const date = DateUtils.dateKey(today.getFullYear(), today.getMonth(), today.getDate());
        phase = "saving";
        submit("render", { snapshot: captured, date: date }, result => {
            finish(result, "saved", "save-failed");
            if (!result.ok) return;
            lastRenderedSignature = signature;
            if (renderAllowed && !upToDate()) scheduleRender();
        });
    }
    function backup(onDone) {
        phase = "backing-up";
        submit("backup", {}, result => {
            finish(result, "backed-up", "backup-failed");
            if (result.ok) restorationPending = false;
            onDone(result.ok);
        });
    }
    function restore(onDone) {
        cancelPending();
        restorationPending = true;
        phase = "restoring";
        submit("restore", {}, result => {
            finish(result, "restored", "restore-failed");
            if (result.ok) lastRenderedSignature = "";
            if (onDone) onDone(result.ok);
        });
    }
    function submit(operation, payload, onDone) {
        if (!backend) { onDone({ ok: false, error: "Image helper is unavailable" }); return; }
        backend.request(operation, payload, onDone);
    }
    function finish(result, success, failure) {
        failedPath = result.ok ? "" : (result.error || result.path || "Image operation failed");
        phase = result.ok ? success : failure;
    }
}
