import QtQuick 2.15
import "js/Storage.js" as Storage

// Persistence scaffolding shared by the concrete stores. A subclass sets
// `filePath` and assigns the `serialize` / `applyLoaded` hooks; it inherits the
// deferred initial load, debounced save, `saved` signal, and flush-on-quit.
QtObject {
    id: jsonStore

    property string filePath: ""
    property bool isLoaded: false
    property int saveDelayMs: 200
    property int _loadGeneration: 0
    property int _writesInFlight: 0
    readonly property bool hasPendingSave: _saveTimer.running || _writesInFlight > 0
    property string lastSaveError: ""
    property var _failedWrites: ({})
    property var _unwritablePaths: ({})
    property bool _alive: true
    Component.onDestruction: { _alive = false; _loadGeneration++; }
    property var readJson: Storage.readJson
    property var writeJson: Storage.writeJson

    // Set by applyLoaded when the file holds something this version cannot read. What is in memory
    // is then not what is on disk, so a write would destroy the real data — saves stay off until
    // the file is replaced off-device. The rejecting store reports the cause; this base only
    // enforces the block.
    property bool isUnwritable: false
    onIsUnwritableChanged: {
        if (isUnwritable) {
            const refused = Object.assign({}, _unwritablePaths);
            refused[filePath] = true;
            _unwritablePaths = refused;
        }
    }

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
        interval: jsonStore.saveDelayMs
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
        const generation = ++jsonStore._loadGeneration;
        const path = jsonStore.filePath;
        jsonStore.isLoaded = false;
        jsonStore.isUnwritable = false;
        jsonStore.readJson(path, data => {
            if (!jsonStore || !jsonStore._alive || generation !== jsonStore._loadGeneration || path !== jsonStore.filePath) return;
            jsonStore.applyLoaded(data);
            if (!jsonStore.isUnwritable) {
                const refused = Object.assign({}, jsonStore._unwritablePaths);
                delete refused[path];
                jsonStore._unwritablePaths = refused;
            }
            jsonStore.isLoaded = true;
        });
    }

    function scheduleSave() {
        jsonStore._saveTimer.restart();
    }

    function flushPendingSave() {
        const failed = jsonStore._failedWrites;
        Object.keys(failed).forEach(path => jsonStore._writeSnapshot(path, failed[path].value));
        if (!jsonStore._saveTimer.running) return;
        jsonStore._saveTimer.stop();
        jsonStore._doSave();
    }

    function _doSave() {
        if (jsonStore.isUnwritable) {
            jsonStore.lastSaveError = "The file is unreadable";
            jsonStore.saveFailed("Nothing is written to " + jsonStore.filePath + " while its contents are unreadable.");
            return;
        }

        let value;
        try { value = jsonStore.serialize(); }
        catch (error) { jsonStore._onWriteDone(String(error)); return; }
        jsonStore._writeSnapshot(jsonStore.filePath, value);
    }

    function _writeSnapshot(path, value) {
        if (jsonStore._unwritablePaths[path]) {
            jsonStore._onWriteDone("Nothing is written to " + path + " while its contents are unreadable.");
            return;
        }
        jsonStore._writesInFlight++;
        const done = error => {
            if (!jsonStore || !jsonStore._alive) return;
            const failed = Object.assign({}, jsonStore._failedWrites);
            if (error) failed[path] = { value: value, error: error };
            else delete failed[path];
            jsonStore._failedWrites = failed;
            jsonStore._onWriteDone(error);
            const remaining = Object.keys(failed);
            jsonStore.lastSaveError = remaining.length ? failed[remaining[0]].error : "";
            jsonStore._writesInFlight--;
        };
        try { jsonStore.writeJson(path, value, done); }
        catch (error) { done(String(error)); }
    }

    // The write only reports once it has landed, so `saved` means the bytes are on disk rather
    // than merely queued — which is what makes a missing data/ dir a visible modal instead of a
    // silent no-op the session then believes it persisted.
    function _onWriteDone(error) {
        jsonStore.lastSaveError = error || "";
        if (error) {
            console.warn("JsonStore: save failed for", jsonStore.filePath, "-", error);
            jsonStore.saveFailed("Check that the data/ folder exists on the device.\n\n" + error);
            return;
        }

        jsonStore.saved();
    }
}
