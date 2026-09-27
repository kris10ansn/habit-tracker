import QtQuick 2.15
import QtTest 1.2
import "../src/components" as App

TestCase {
    id: testCase
    name: "QuitController"
    when: windowShown
    property var controller
    property var habits
    property var settings
    property var sync
    property var images

    Component {
        id: storeFactory
        QtObject {
            property bool hasPendingSave: false
            property string lastSaveError: ""
            property bool hasSyncedSuccessfully: true
            property bool isRequestInFlight: false
            property string status: ""
            property int flushes: 0
            property int aborts: 0
            function flushPendingSave() { flushes++; }
            function abortSync() { aborts++; isRequestInFlight = false; status = ""; }
        }
    }
    Component {
        id: imagesFactory
        QtObject {
            property bool canHandOff: true
            property bool closing: false
            property int handoffs: 0
            property var callback: null
            function beginQuit() { closing = true; }
            function cancelQuit() { closing = false; }
            function finishInBackground(onDone) { handoffs++; callback = onDone; }
            function reply(result) { const onDone = callback; callback = null; onDone(result); }
        }
    }
    Component { id: controllerFactory; App.QuitController {} }
    SignalSpy { id: closed; target: controller; signalName: "readyToClose" }

    function init() {
        habits = storeFactory.createObject(testCase);
        settings = storeFactory.createObject(testCase);
        sync = storeFactory.createObject(testCase);
        images = imagesFactory.createObject(testCase);
        controller = controllerFactory.createObject(testCase, {
            habitsStore: habits, settingsStore: settings, syncStore: sync, powerImages: images
        });
        closed.clear();
    }
    function cleanup() {
        controller.destroy(); habits.destroy(); settings.destroy(); sync.destroy(); images.destroy();
    }

    function test_quitWaitsForAcknowledgmentThenCloses() {
        controller.requestQuit();
        verify(controller.quitting);
        verify(images.closing);
        compare(habits.flushes, 1);
        compare(settings.flushes, 1);
        compare(sync.flushes, 1);
        compare(images.handoffs, 1);
        compare(closed.count, 0);
        controller.requestQuit();
        compare(images.handoffs, 1);
        images.reply({ ok: true });
        compare(closed.count, 1);
    }

    function test_syncAndItsResultingSavesFinishBeforeHandoff() {
        sync.isRequestInFlight = true;
        controller.requestQuit();
        compare(images.handoffs, 0);
        habits.hasPendingSave = true;
        sync.hasPendingSave = true;
        sync.isRequestInFlight = false;
        wait(150);
        compare(images.handoffs, 0);
        habits.hasPendingSave = false;
        wait(150);
        compare(images.handoffs, 0);
        sync.hasPendingSave = false;
        tryCompare(images, "handoffs", 1);
    }

    function test_failedSaveKeepsAppOpenEvenWhenImagesAreDisabled() {
        settings.lastSaveError = "disk full";
        controller.requestQuit();
        verify(!controller.quitting);
        verify(!images.closing);
        compare(closed.count, 0);
        compare(images.handoffs, 0);
        verify(controller.errorMessage.indexOf("disk full") >= 0);
    }

    function test_handoffFailureKeepsAppOpenAndCanRetry() {
        controller.requestQuit();
        images.reply({ ok: false, error: "writer unavailable" });
        verify(!controller.quitting);
        verify(!images.closing);
        compare(closed.count, 0);
        controller.requestQuit();
        images.reply({ ok: true });
        compare(closed.count, 1);
    }

    function test_changedCaptureRetriesBeforeClosing() {
        controller.requestQuit();
        images.reply({ ok: false, superseded: true });
        compare(closed.count, 0);
        tryCompare(images, "handoffs", 2);
        images.reply({ ok: true });
        compare(closed.count, 1);
    }

    function test_settingTransitionFinishesBeforeHandoff() {
        images.canHandOff = false;
        controller.requestQuit();
        compare(images.handoffs, 0);
        images.canHandOff = true;
        tryCompare(images, "handoffs", 1);
    }

    function test_unsuccessfulInitialSyncIsAbortedAsBefore() {
        sync.hasSyncedSuccessfully = false;
        sync.isRequestInFlight = true;
        controller.requestQuit();
        compare(sync.aborts, 1);
        compare(images.handoffs, 1);
    }
}
