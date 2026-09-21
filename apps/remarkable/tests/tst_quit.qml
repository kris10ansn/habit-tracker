import QtQuick 2.15
import QtTest 1.2
import "../src" as App
import "TestPaths.js" as TestPaths

TestCase {
    id: testCase
    name: "Quit"
    when: windowShown
    width: 1404
    height: 1872
    property var app: null
    property var habits: null
    property var settings: null
    property var sync: null
    property var images: null
    Component { id: factory; App.Main {} }
    SignalSpy { id: closed; signalName: "close" }

    function init() {
        app = createTemporaryObject(factory, testCase, {
            screenshotMode: true,
            dataDir: TestPaths.tmpPath("quit"),
            settingsFilePath: TestPaths.tmpPath("quit/settings.json"),
            today: new Date(2026, 7, 17)
        });
        tryVerify(() => app.screenshotReady);
        habits = findChild(app, "habitsStore");
        settings = findChild(app, "settingsStore");
        sync = findChild(app, "syncStore");
        images = findChild(app, "suspendCanvas");
        tryVerify(() => !habits.hasPendingSave && !settings.hasPendingSave && !sync.hasPendingSave);
        closed.target = app;
        closed.clear();
    }
    function test_quitAwaitsLocalSaveCompletionWithoutBlockingEvents() {
        let finish;
        habits._month.writeJson = function (path, value, onDone) { finish = onDone; };
        habits.toggleEntry(0, "2026-08-01");
        app.quit();
        compare(closed.count, 0);
        verify(habits.hasPendingSave);
        let eventRan = false;
        Qt.callLater(() => eventRan = true);
        tryVerify(() => eventRan);
        compare(closed.count, 0);
        finish(null);
        tryCompare(closed, "count", 1);
    }
    function test_failedSaveKeepsAppOpenAndCanBeRetried() {
        const writes = [];
        habits._month.writeJson = function (path, value, onDone) { writes.push(onDone); };
        habits.toggleEntry(0, "2026-08-02");
        app.quit();
        writes[0]("Disk full");
        tryCompare(app, "_quitting", false);
        compare(closed.count, 0);
        app.quit();
        compare(writes.length, 2);
        writes[1](null);
        tryCompare(closed, "count", 1);
    }
    function test_quitAbortsNetworkWithoutWaitingForResponse() {
        let aborted = false;
        sync.settingsStore = { serverUrl: "http://example.test" };
        sync.createRequest = function () {
            return { open: function () {}, setRequestHeader: function () {}, send: function () {},
                abort: function () { aborted = true; } };
        };
        sync.syncNow();
        verify(sync.isRequestInFlight);
        app.quit();
        verify(aborted);
        tryCompare(closed, "count", 1);
    }
    function test_quitWaitsForImageOperationAndItsSettingSave() {
        const saves = [];
        settings.suspendImageEnabled = false;
        settings.writeJson = function (path, value, onDone) { saves.push(onDone); };
        images.busy = true;
        app.quit();
        compare(closed.count, 0);
        settings.setSuspendImageEnabled(true);
        images.busy = false;
        tryCompare(saves, "length", 1);
        compare(closed.count, 0);
        saves[0](null);
        tryCompare(closed, "count", 1);
    }
}
