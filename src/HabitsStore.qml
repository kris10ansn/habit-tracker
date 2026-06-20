import QtQuick 2.15
import "js/Storage.js" as Storage
import "js/habits.js" as DefaultHabits
import "js/HabitsModel.js" as HabitsModel

QtObject {
    id: store

    property string filePath: "/home/root/xovi/exthome/appload/habit-tracker/habits.json"

    property ListModel habits: ListModel {
        dynamicRoles: true
    }

    property Timer _saveTimer: Timer {
        interval: 200
        repeat: false
        onTriggered: store._doSave()
    }

    signal saved

    property bool isLoaded: false

    // Defer past first paint.
    Component.onCompleted: Qt.callLater(_initialLoad)

    function _initialLoad() {
        load();
        isLoaded = true;
    }

    function load() {
        const data = Storage.readJson(filePath);
        const hasData = Array.isArray(data);
        const items = hasData ? data : DefaultHabits.habits;

        // Bulk append — one rowsInserted vs N avoids per-row e-ink flash.
        habits.clear();

        if (items.length > 0) {
            habits.append(items);
        }

        if (hasData) {
            return;
        }

        if (Storage.isCorrupt(data)) {
            console.warn("HabitsStore: refusing to overwrite corrupt file at", filePath, "- using defaults in memory only");
            return;
        }

        _doSave();
    }

    function flushPendingSave() {
        if (!_saveTimer.running) {
            return;
        }

        _saveTimer.stop();
        _doSave();
    }

    function _doSave() {
        Storage.writeJson(filePath, HabitsModel.toArray(habits));
        saved();
    }

    function _scheduleSave() {
        _saveTimer.restart();
    }

    function _inBounds(i) {
        return i >= 0 && i < habits.count;
    }

    function add(name, negative) {
        const trimmed = (name || "").trim();
        if (!trimmed) {
            return;
        }

        habits.append({
            name: trimmed,
            negative: !!negative,
            entries: {}
        });

        _scheduleSave();
    }

    function move(from, to) {
        if (!_inBounds(from) || !_inBounds(to) || from === to) {
            return;
        }

        habits.move(from, to, 1);
        _scheduleSave();
    }

    function remove(index) {
        if (!_inBounds(index)) {
            return;
        }
        habits.remove(index);
        _scheduleSave();
    }

    function setNegative(index, negative) {
        if (!_inBounds(index)) {
            return;
        }
        habits.setProperty(index, "negative", !!negative);
        _scheduleSave();
    }

    function setHideFromSleep(index, hidden) {
        if (!_inBounds(index)) {
            return;
        }
        habits.setProperty(index, "hideFromSleep", !!hidden);
        _scheduleSave();
    }

    function setName(index, name) {
        const trimmed = (name || "").trim();
        if (!_inBounds(index) || !trimmed) {
            return;
        }
        habits.setProperty(index, "name", trimmed);
        _scheduleSave();
    }

    function toggleEntry(index, dateKey) {
        if (!_inBounds(index)) {
            return;
        }

        const habit = habits.get(index);
        const currentEntries = habit.entries || {};
        const current = currentEntries[dateKey] || "";
        // positive: empty -> x -> o -> empty
        // negative: empty(displayed X) -> o -> empty
        const next = habit.negative ? (current === "o" ? "" : "o") : (current === "" ? "x" : current === "x" ? "o" : "");

        const entries = Object.assign({}, currentEntries);
        if (next) {
            entries[dateKey] = next;
        } else {
            delete entries[dateKey];
        }

        habits.setProperty(index, "entries", entries);
        _scheduleSave();
    }
}
