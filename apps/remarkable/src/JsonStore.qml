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
    signal saveFailed(string message)

    // serialize() -> the value to write. applyLoaded(data) folds a just-read
    // value (or a Storage MISSING/CORRUPT sentinel) into in-memory state.
    // serialize has no safe default: writing its fallback would clobber the
    // file, so the base throws until a subclass assigns the hook.
    property var serialize: (function () {
            throw new Error("JsonStore: subclass must assign serialize before saving");
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

    // Re-read the (possibly re-pointed) file into memory. Used when a store swaps
    // filePath at runtime — e.g. month navigation. Stays loaded throughout so
    // dependent views update in place rather than tearing down.
    function reload() {
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
        try {
            Storage.writeJson(jsonStore.filePath, jsonStore.serialize());
        } catch (e) {
            console.warn("JsonStore: save failed for", jsonStore.filePath, "-", e);
            jsonStore.saveFailed(String(e));
            return;
        }

        jsonStore.saved();
    }
}
