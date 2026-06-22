import QtQuick 2.15
import "js/Storage.js" as Storage

// Persistence scaffolding shared by the concrete stores. A subclass sets
// `filePath` and assigns the `serialize` / `applyLoaded` hooks; it inherits the
// deferred initial load, debounced save, `saved` signal, and flush-on-quit.
QtObject {
    id: jsonStore

    property string filePath: ""
    property bool isLoaded: false

    signal saved

    // serialize() -> the value to write. applyLoaded(data) folds a just-read
    // value (or a Storage MISSING/CORRUPT sentinel) into in-memory state.
    property var serialize: (function () {
            return null;
        })
    property var applyLoaded: (function (data) {})

    property Timer _saveTimer: Timer {
        interval: 200
        repeat: false
        onTriggered: jsonStore._doSave()
    }

    // Defer past first paint.
    Component.onCompleted: Qt.callLater(jsonStore._initialLoad)

    function _initialLoad() {
        jsonStore.applyLoaded(Storage.readJson(jsonStore.filePath));
        jsonStore.isLoaded = true;
    }

    function scheduleSave() {
        jsonStore._saveTimer.restart();
    }

    function flushPendingSave() {
        if (!jsonStore._saveTimer.running) {
            return;
        }

        jsonStore._saveTimer.stop();
        jsonStore._doSave();
    }

    function _doSave() {
        Storage.writeJson(jsonStore.filePath, jsonStore.serialize());
        jsonStore.saved();
    }
}
