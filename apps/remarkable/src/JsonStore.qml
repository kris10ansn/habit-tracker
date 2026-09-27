import QtQuick 2.15
import "js/Storage.js" as Storage

// Persistence scaffolding shared by the concrete stores. A subclass sets
// `filePath` and assigns the `serialize` / `applyLoaded` hooks; it inherits the
// deferred initial load, debounced save, `saved` signal, and flush-on-quit.
QtObject {
    id: jsonStore

    property string filePath: ""
    property bool isLoaded: false

    // Set by applyLoaded when the file holds something this version cannot read. What is in memory
    // is then not what is on disk, so a write would destroy the real data — saves stay off until
    // the file is replaced off-device. The rejecting store reports the cause; this base only
    // enforces the block.
    property bool isUnwritable: false

    readonly property bool hasPendingSave: _saveTimer.running || _writing || _queue.length > 0
    property string lastSaveError: ""
    property bool _writing: false
    property var _queue: []
    property var _waiters: []
    property var writeFile: Storage.writeFile

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
    Component.onCompleted: Qt.callLater(jsonStore.reload)

    // Read the (possibly re-pointed) file into memory — once on startup, and again whenever a
    // store swaps filePath at runtime, e.g. month navigation. Restores isLoaded to true; a caller
    // that wants the dependent Loader to tear down and rebuild first sets isLoaded false before
    // calling (see HabitsStore.loadMonth). Every read re-decides isUnwritable, so navigating off
    // an unreadable file and back onto a readable one lifts the block.
    function reload() {
        const requestedPath = filePath;
        if (_writing || _queue.length) {
            isLoaded = false;
            whenSaved(() => {
                if (filePath === requestedPath) _reload();
            });
            return;
        }
        _reload();
    }

    function _reload() {
        jsonStore.isUnwritable = false;
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

    function whenSaved(onDone) {
        _waiters = _waiters.concat([onDone]);
        flushPendingSave();
        _notifySettled();
    }

    function _notifySettled() {
        if (hasPendingSave || !_waiters.length) return;

        const callbacks = _waiters;
        _waiters = [];
        callbacks.forEach(callback => callback(lastSaveError));
    }

    function _doSave() {
        _saveTimer.stop();
        if (isUnwritable) {
            _failed("Nothing is written to " + filePath + " while its contents are unreadable.");
            return;
        }
        try {
            const body = JSON.stringify(serialize());
            if (!body) throw new Error("No serializable data for " + filePath);
            const write = { path: filePath, body: body };
            _queue = _queue.filter(pending => pending.path !== write.path).concat([write]);
            _writeNext();
        } catch (error) {
            _failed(String(error));
        }
    }

    function _writeNext() {
        if (_writing || !_queue.length) return;

        const write = _queue[0];
        _writing = true;
        _queue = _queue.slice(1);
        writeFile(write.path, write.body, error => {
            _writing = false;
            if (error) _failed("Check that the data/ folder exists on the device.\n\n" + error);
            else {
                lastSaveError = "";
                saved();
            }
            _writeNext();
            _notifySettled();
        });
    }

    function _failed(message) {
        lastSaveError = message;
        saveFailed(message);
        _notifySettled();
    }
}
