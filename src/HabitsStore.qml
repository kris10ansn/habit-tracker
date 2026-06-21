import QtQuick 2.15
import "js/Storage.js" as Storage
import "js/habits.js" as DefaultHabits
import "js/HabitsModel.js" as HabitsModel

JsonStore {
    id: store

    filePath: "/home/root/xovi/exthome/appload/habit-tracker/habits.json"

    property ListModel habits: ListModel {
        dynamicRoles: true
    }

    serialize: function () {
        return HabitsModel.toArray(store.habits);
    }

    applyLoaded: function (data) {
        const hasData = Array.isArray(data);
        const items = hasData ? data : DefaultHabits.habits;

        // Bulk append — one rowsInserted vs N avoids per-row e-ink flash.
        store.habits.clear();

        if (items.length > 0) {
            store.habits.append(items);
        }

        if (hasData) {
            return;
        }

        if (Storage.isCorrupt(data)) {
            console.warn("HabitsStore: refusing to overwrite corrupt file at", store.filePath, "- using defaults in memory only");
            return;
        }

        store._doSave();
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

        scheduleSave();
    }

    function move(from, to) {
        if (!_inBounds(from) || !_inBounds(to) || from === to) {
            return;
        }

        habits.move(from, to, 1);
        scheduleSave();
    }

    function remove(index) {
        if (!_inBounds(index)) {
            return;
        }
        habits.remove(index);
        scheduleSave();
    }

    function setNegative(index, negative) {
        if (!_inBounds(index)) {
            return;
        }
        habits.setProperty(index, "negative", !!negative);
        scheduleSave();
    }

    function setHideFromSleep(index, hidden) {
        if (!_inBounds(index)) {
            return;
        }
        habits.setProperty(index, "hideFromSleep", !!hidden);
        scheduleSave();
    }

    function setName(index, name) {
        const trimmed = (name || "").trim();
        if (!_inBounds(index) || !trimmed) {
            return;
        }
        habits.setProperty(index, "name", trimmed);
        scheduleSave();
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
        scheduleSave();
    }
}
