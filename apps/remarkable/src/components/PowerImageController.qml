import QtQuick 2.15
import "../js/DateUtils.js" as DateUtils

Item {
    id: controller
    property var backend: null
    property var habitsStore: null
    property var settingsStore: null
    property date today: new Date()
    property bool renderAllowed: false
    readonly property bool busy: _preparing || (!!backend && backend.busy)
    readonly property bool hasPendingWork: busy || _changingSetting || _renderRequested || debounce.running
    readonly property bool restorationPending: !!settingsStore && settingsStore.powerImageRestorePending
    property string phase: ""
    property string failedPath: ""
    property var imageProgress: null
    property int remainingSeconds: 0
    readonly property bool canHandOff: !_preparing && !_changingSetting
    property bool _quitting: false
    property bool _renderRequested: false
    property bool _preparing: false
    property bool _changingSetting: false

    onRenderAllowedChanged: if (!renderAllowed) cancelPending()
    onBusyChanged: if (!busy && _renderRequested) Qt.callLater(controller.scheduleRender)
    Connections {
        target: controller.backend
        function onFailed(message) { controller.failedPath = message; controller.phase = "save-failed"; }
        function onProgress(operation, phase, message, imageProgress) {
            if (operation !== "render" && operation !== "backup" && operation !== "restore") return;
            controller.imageProgress = imageProgress;
            if (phase) controller.phase = phase;
        }
    }
    Timer { id: debounce; interval: 3000; onTriggered: controller.renderAsync() }
    Timer { id: countdown; interval: 1000; repeat: true; onTriggered: controller.remainingSeconds = Math.max(0, controller.remainingSeconds - 1) }

    function cancelPending() {
        debounce.stop();
        countdown.stop();
        _renderRequested = false;
        if (phase === "pending") phase = "";
    }
    function scheduleRender() {
        if (_quitting || !renderAllowed || restorationPending || _changingSetting) return;
        if (busy) { _renderRequested = true; return; }
        _renderRequested = false;
        phase = "pending";
        remainingSeconds = 3;
        debounce.restart();
        countdown.restart();
    }
    function renderAsync() {
        if (_quitting || !renderAllowed || restorationPending || _changingSetting) return;
        if (busy) { _renderRequested = true; return; }
        cancelPending();
        phase = "saving";
        imageProgress = null;
        _preparing = true;
        const date = DateUtils.dateKey(today.getFullYear(), today.getMonth(), today.getDate());
        prepareInput((error, expected) => {
            if (error || !renderAllowed || restorationPending) {
                _preparing = false;
                finish({ ok: !error, error: error }, "", "save-failed");
                return;
            }
            submit("render", { expected: expected, date: date }, result => {
                if (result.superseded) {
                    phase = "";
                    scheduleRender();
                    return;
                }
                finish(result, "saved", "save-failed");
            });
            _preparing = false;
        });
    }
    function beginQuit() {
        _quitting = true;
        cancelPending();
    }

    function cancelQuit() {
        _quitting = false;
        scheduleRender();
    }

    function finishInBackground(onDone) {
        if (!renderAllowed || restorationPending) {
            if (!backend || !backend.busy) {
                onDone({ ok: true });
                return;
            }
            backend.handoff("finish-background", {}, onDone);
            return;
        }

        _preparing = true;
        prepareInput((error, expected) => {
            _preparing = false;
            if (error) {
                onDone({ ok: false, error: error });
                return;
            }
            if (!backend) {
                onDone({ ok: false, error: "Image writer is unavailable" });
                return;
            }
            const date = DateUtils.dateKey(today.getFullYear(), today.getMonth(), today.getDate());
            backend.handoff("render", { handoff: true, expected: expected, date: date }, onDone);
        });
    }

    function prepareInput(onDone) {
        if (!habitsStore || !settingsStore) { onDone("Saved habit data is unavailable", null); return; }
        settingsStore.whenSaved(error => {
            if (error) { onDone(error, null); return; }
            habitsStore.prepareImageInput((habitError, expected) => {
                if (habitError || settingsStore.lastSaveError) {
                    onDone(habitError || settingsStore.lastSaveError, null);
                    return;
                }
                if (settingsStore.hasPendingSave) {
                    Qt.callLater(() => prepareInput(onDone));
                    return;
                }
                onDone(null, expected);
            });
        });
    }
    function setEnabled(enabled) {
        if (busy || _changingSetting) return;
        cancelPending();
        _changingSetting = true;
        _preparing = true;
        if (!enabled) {
            persistSetting(false, true, ok => {
                _preparing = false;
                if (!ok) { _changingSetting = false; return; }
                restore();
            });
            return;
        }
        if (restorationPending) {
            _preparing = false;
            _changingSetting = false;
            failedPath = "Restore original images before enabling writing again";
            phase = "restore-failed";
            return;
        }
        phase = "backing-up";
        submit("backup", {}, result => {
            if (!result.ok) {
                _preparing = false;
                _changingSetting = false;
                finish(result, "backed-up", "backup-failed");
                return;
            }
            persistSetting(true, false, ok => {
                _preparing = false;
                _changingSetting = false;
                if (ok) renderAsync();
            });
        });
    }
    function persistSetting(enabled, pending, onDone) {
        settingsStore.savePowerImageState(enabled, pending, error => {
            if (error) finish({ ok: false, error: error }, "", "save-failed");
            onDone(!error);
        });
    }
    function restore() {
        if (!settingsStore || settingsStore.suspendImageEnabled) return;
        cancelPending();
        _changingSetting = true;
        _preparing = true;
        phase = "restoring";
        submit("restore", {}, result => {
            finish(result, "restored", "restore-failed");
            if (!result.ok) { _preparing = false; _changingSetting = false; return; }
            persistSetting(false, false, ok => {
                _preparing = false;
                _changingSetting = false;
                if (ok) phase = "restored";
            });
        });
    }
    function submit(operation, payload, onDone) {
        imageProgress = null;
        failedPath = "";
        if (!backend) { onDone({ ok: false, error: "Image writer is unavailable" }); return; }
        backend.request(operation, payload, onDone);
    }
    function finish(result, success, failure) {
        imageProgress = null;
        failedPath = result.ok ? "" : (result.error || result.path || "Image operation failed");
        phase = result.ok ? success : failure;
    }
}
