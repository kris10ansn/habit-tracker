import QtQuick 2.15
import QtTest 1.2
import "../src/components" as App
import "../src/js/SuspendStatus.js" as SuspendStatus

TestCase {
    id: testCase
    name: "PowerImageController"
    when: windowShown
    property var controller: null
    property var backend: null
    property var habits: null
    property var settings: null
    Component { id: controllerFactory; App.PowerImageController {} }
    Component {
        id: backendFactory
        Item {
            property bool busy: false
            property var requests: []
            signal progress(string operation, string phase, string message, var imageProgress)
            signal failed(string message)
            function request(operation, payload, onDone, waitFor = "done") {
                busy = true;
                requests = requests.concat([{ operation: operation, payload: payload, onDone: onDone, waitFor: waitFor }]);
            }
            function complete(result) {
                const callback = requests[requests.length - 1].onDone;
                busy = false;
                callback(result);
            }
        }
    }
    Component {
        id: habitsFactory
        QtObject {
            property var pending: null
            function prepareImageInput(onDone) { pending = onDone; }
            function prepared(error = null) {
                const callback = pending;
                pending = null;
                callback(error, { roster: "a".repeat(32), month: "missing" });
            }
        }
    }
    Component {
        id: settingsFactory
        QtObject {
            property bool suspendImageEnabled: true
            property bool powerImageRestorePending: false
            property var pending: null
            property bool saving: false
            function savePowerImageState(enabled, restorePending, onDone) {
                const previousEnabled = suspendImageEnabled;
                const previousPending = powerImageRestorePending;
                suspendImageEnabled = enabled;
                powerImageRestorePending = restorePending;
                saving = true;
                pending = error => {
                    if (error) { suspendImageEnabled = previousEnabled; powerImageRestorePending = previousPending; }
                    onDone(error);
                };
            }
            function whenSaved(onDone) { if (saving) pending = onDone; else onDone(null); }
            function saved(error = null) { saving = false; const callback = pending; pending = null; callback(error); }
        }
    }
    function init() {
        backend = backendFactory.createObject(testCase);
        habits = habitsFactory.createObject(testCase);
        settings = settingsFactory.createObject(testCase);
        controller = controllerFactory.createObject(testCase, { backend: backend, habitsStore: habits, settingsStore: settings, today: new Date(2026, 8, 22), renderAllowed: true });
    }
    function cleanup() { controller.destroy(); backend.destroy(); habits.destroy(); settings.destroy(); }
    function test_waitsForConfirmedFilesAndReportsImageProgress() {
        controller.renderAsync();
        verify(controller.busy);
        compare(backend.requests.length, 0);
        habits.prepared();
        compare(backend.requests[0].payload.expected.month, "missing");
        verify(!backend.requests[0].payload.snapshot);
        backend.progress("render", "saving", "", { path: "/usr/share/remarkable/poweroff.png", remainingImages: 7 });
        compare(SuspendStatus.text(controller.phase, 0, controller.failedPath, controller.imageProgress), "poweroff.png — Saving (7 left)");
        backend.complete({ ok: false, error: "write failed" });
        compare(controller.phase, "save-failed");
        compare(controller.imageProgress, null);
    }
    function test_failedDataSaveNeverRequestsImages() {
        controller.renderAsync();
        habits.prepared("disk full");
        compare(backend.requests.length, 0);
        compare(controller.phase, "save-failed");
    }
    function test_changedFilesQueueANewCapture() {
        controller.renderAsync(); habits.prepared();
        backend.complete({ ok: false, superseded: true });
        compare(controller.phase, "pending");
    }
    function test_disablePersistsBeforeRestoreAndFailureStaysDisabled() {
        controller.setEnabled(false);
        compare(settings.suspendImageEnabled, false);
        verify(settings.powerImageRestorePending);
        compare(backend.requests.length, 0);
        settings.saved();
        compare(backend.requests[0].operation, "restore");
        backend.complete({ ok: false, error: "restore failed" });
        compare(settings.suspendImageEnabled, false);
        verify(controller.restorationPending);
        controller.restore();
        backend.complete({ ok: true });
        settings.saved();
        verify(!controller.restorationPending);
        compare(controller.phase, "restored");
    }
    function test_failedDisableSaveDoesNotRestore() {
        controller.setEnabled(false);
        settings.saved("disk full");
        compare(backend.requests.length, 0);
        compare(controller.phase, "save-failed");
        verify(settings.suspendImageEnabled);
        controller.setEnabled(false);
        settings.saved();
        compare(backend.requests[0].operation, "restore");
        backend.complete({ ok: true });
        settings.saved();
        verify(!controller.restorationPending);
    }
    function test_enableWaitsForBackupsAndPersistedOptIn() {
        settings.suspendImageEnabled = false;
        controller.setEnabled(true);
        compare(backend.requests[0].operation, "backup");
        compare(settings.suspendImageEnabled, false);
        backend.complete({ ok: true });
        compare(backend.requests.length, 1);
        compare(habits.pending, null);
        settings.saved();
        habits.prepared();
        compare(backend.requests[1].operation, "render");
        backend.complete({ ok: true });
    }
    function test_queuedRenderStaysPendingUntilDeferredReschedule() {
        controller.renderAsync(); habits.prepared();
        controller.renderAsync();
        backend.complete({ ok: true });
        verify(controller.hasPendingWork);
        tryCompare(controller, "phase", "pending");
        verify(controller.hasPendingWork);
    }
    function test_disableCancelsQueuedRender() {
        controller.scheduleRender();
        controller.setEnabled(false);
        settings.saved(); backend.complete({ ok: true }); settings.saved();
        compare(controller.phase, "restored");
        verify(!controller._renderRequested);
    }
    function test_quitHandsLatestSavedDataOverDuringActiveRender() {
        controller.renderAsync();
        habits.prepared();
        controller.beginQuit();
        controller.scheduleRender();
        verify(!controller._renderRequested);
        let result = null;
        controller.finishInBackground(reply => result = reply);
        compare(backend.requests.length, 1);
        habits.prepared();
        compare(backend.requests.length, 2);
        compare(backend.requests[0].waitFor, "done");
        compare(backend.requests[1].waitFor, "accepted");
        verify(backend.requests[1].payload.handoff === undefined);
        compare(backend.requests[1].payload.expected.roster, "a".repeat(32));
        compare(result, null);
        backend.requests[1].onDone({ ok: true });
        verify(result.ok);
        verify(backend.busy);
    }

    function test_quitFromAnotherMonthHandsOffOnlyTheExistingBatch() {
        controller.renderAsync();
        habits.prepared();
        controller.renderAllowed = false;
        controller.beginQuit();
        controller.finishInBackground(() => {});
        compare(backend.requests[1].operation, "finish-background");
        compare(habits.pending, null);
    }

    function test_quitDoesNotHandoffFailedLocalSaves() {
        controller.beginQuit();
        let result = null;
        controller.finishInBackground(reply => result = reply);
        habits.prepared("disk full");
        verify(!result.ok);
        compare(backend.requests.length, 0);
    }

}
