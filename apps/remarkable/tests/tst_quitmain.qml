import QtQuick 2.15
import QtTest 1.2
import "../src" as App
import "TestPaths.js" as TestPaths

TestCase {
    id: testCase
    name: "QuitMain"
    when: windowShown
    width: 1404
    height: 1872
    property var app: null

    Component { id: appFactory; App.Main { screenshotMode: true } }
    SignalSpy { id: closed; target: app; signalName: "close" }

    function test_mainConnectsQuitToItsRealStoresAndCloseSignal() {
        app = appFactory.createObject(testCase, {
            dataDir: TestPaths.tmpPath("habits-seed"),
            settingsFilePath: TestPaths.tmpPath("quit-settings.json"),
            syncFilePath: TestPaths.tmpPath("quit-sync.json"),
            today: new Date(2026, 8, 22)
        });
        verify(app !== null);
        tryCompare(app, "screenshotReady", true);
        closed.clear();
        app.quit();
        tryCompare(closed, "count", 1);
        app.unloading();
        app.destroy();
        app = null;
    }
}
