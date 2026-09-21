import QtQuick 2.15
import "js/HabitsModel.js" as HabitsModel
import "js/SuspendDraw.js" as SuspendDraw
import "js/DateUtils.js" as DateUtils

QtObject {
    id: store
    property var habits: null
    property date today: new Date()
    property bool renderAllowed: false
    property bool restorationPending: false
    property bool lastRenderFailed: false
    property string failedPath: ""
    property string phase: ""
    property int remainingSeconds: 0
    property string lastRenderedSignature: ""
    property bool _renderInFlight: false
    property bool _operationInFlight: false
    property int _generation: 0
    property bool _alive: true
    readonly property bool busy: _renderInFlight || _operationInFlight
    property PowerImageClient client: PowerImageClient {}
    property var sendRequest: function (operation, snapshot, onDone, onAccepted) {
        client.request(operation, snapshot, onDone, onAccepted);
    }
    property Timer _debounce: Timer {
        interval: 3000
        onTriggered: store.renderAsync()
    }
    property Timer _tick: Timer {
        interval: 1000
        repeat: true
        running: store._debounce.running
        onTriggered: store.remainingSeconds = Math.max(0, store.remainingSeconds - 1)
    }
    Component.onDestruction: _alive = false
    onRenderAllowedChanged: if (!renderAllowed) cancelPending()

    function _signature() {
        return SuspendDraw.computeSignature(HabitsModel.toSuspendHabits(store.habits), store.today);
    }

    function _snapshot() {
        const month = DateUtils.monthKey(store.today.getFullYear(), store.today.getMonth());
        return { date: DateUtils.dateKey(store.today.getFullYear(), store.today.getMonth(), store.today.getDate()),
            roster: { habits: HabitsModel.toRoster(store.habits) },
            month: { month: month, entries: HabitsModel.toMonthEntryRows(store.habits) },
            rendererSignature: store._signature() };
    }

    function scheduleRender() {
        if (!renderAllowed || restorationPending || _signature() === lastRenderedSignature) return;
        if (busy) return; // Completion compares the latest model with the captured snapshot.
        store.phase = "pending";
        store.remainingSeconds = 3;
        store._debounce.restart();
    }

    function renderAsync() {
        if (!renderAllowed || restorationPending || busy) return;
        store._debounce.stop();
        if (_signature() === lastRenderedSignature) { store.phase = "saved"; return; }
        const signature = _signature();
        const generation = _generation;
        store._renderInFlight = true;
        store.phase = "saving";
        sendRequest("render", _snapshot(), result => {
            if (!store || !store._alive) return;
            store._renderInFlight = false;
            if (generation !== store._generation) {
                if (store.renderAllowed && !store.restorationPending) store.scheduleRender();
                return;
            }
            store._report(result, "saved", "save-failed");
            if (result.ok) store.lastRenderedSignature = signature;
            if (result.ok && store.renderAllowed && signature !== store._signature()) store.scheduleRender();
        });
    }

    function renderOnce(onDone) {
        if (busy) { onDone(false); return; }
        store._renderInFlight = true;
        store.phase = "saving";
        sendRequest("preview", _snapshot(), result => {
            if (!store || !store._alive) return;
            store._renderInFlight = false;
            store._report(result, "saved", "save-failed");
            onDone(!!result.ok);
        });
    }

    function submitForQuit(onReady) {
        store._debounce.stop();
        if (!renderAllowed || restorationPending || _signature() === lastRenderedSignature) { onReady(); return; }
        let finished = false;
        const finish = () => { if (!finished) { finished = true; onReady(); } };
        sendRequest("render", _snapshot(), result => {
            if (!store || !store._alive) return;
            store._report(result, "saved", "save-failed");
            finish();
        }, finish);
    }

    function cancelPending() {
        store._generation++;
        store._debounce.stop();
        if (store._renderInFlight) sendRequest("cancel", {}, result => {});
        if (store.phase === "pending" || store.phase === "saving") store.phase = "";
    }

    function backup(onDone) {
        if (_operationInFlight) { onDone(false); return; }
        store._operationInFlight = true;
        store.phase = "backing-up";
        sendRequest("backup", {}, result => {
            if (!store || !store._alive) return;
            store._operationInFlight = false;
            store._report(result, "backed-up", "backup-failed");
            onDone(!!result.ok);
        });
    }

    function restore(onDone) {
        if (_operationInFlight) { if (onDone) onDone(false); return; }
        store._generation++;
        store._debounce.stop();
        store.restorationPending = true;
        store._operationInFlight = true;
        store.phase = "restoring";
        sendRequest("restore", {}, result => {
            if (!store || !store._alive) return;
            store._operationInFlight = false;
            store._report(result, "restored", "restore-failed");
            if (result.ok) store.lastRenderedSignature = "";
            if (onDone) onDone(!!result.ok);
        });
    }

    function _report(result, succeeded, failed) {
        store.lastRenderFailed = !result.ok;
        store.failedPath = result.ok ? "" : (result.path || result.error || "Image operation failed");
        store.phase = result.ok ? succeeded : failed;
    }
}
