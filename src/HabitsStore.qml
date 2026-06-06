import QtQuick 2.15
import "js/Storage.js" as Storage
import "js/habits.js" as DefaultHabits

QtObject {
    id: store

    property string filePath: "/home/root/xovi/exthome/appload/habit-tracker/habits.json"
    property var habits: []

    signal saved

    Component.onCompleted: load()

    function load() {
        const data = Storage.readJson(filePath);

        if (Array.isArray(data)) {
            habits = data;
            return;
        }

        habits = DefaultHabits.habits.slice();

        if (Storage.isCorrupt(data)) {
            console.warn("HabitsStore: refusing to overwrite corrupt file at", filePath, "- using defaults in memory only");
            return;
        }

        save();
    }

    function save() {
        Storage.writeJson(filePath, habits);
        saved();
    }

    function _inBounds(i) {
        return i >= 0 && i < habits.length;
    }

    function _replace(index, updates) {
        const merged = Object.assign({}, habits[index], updates);
        habits = [...habits.slice(0, index), merged, ...habits.slice(index + 1)];
        save();
    }

    function add(name, negative) {
        const trimmed = (name || "").trim();
        if (!trimmed) return;

        habits = [...habits, { name: trimmed, negative: !!negative, entries: {} }];
        save();
    }

    function move(from, to) {
        if (!_inBounds(from) || !_inBounds(to) || from === to) return;

        const copy = habits.slice();
        const [item] = copy.splice(from, 1);
        copy.splice(to, 0, item);

        habits = copy;
        save();
    }

    function remove(index) {
        if (!_inBounds(index)) return;

        habits = [...habits.slice(0, index), ...habits.slice(index + 1)];
        save();
    }

    function setNegative(index, negative) {
        if (!_inBounds(index)) return;
        _replace(index, { negative: !!negative });
    }

    function setHideFromSleep(index, hidden) {
        if (!_inBounds(index)) return;
        _replace(index, { hideFromSleep: !!hidden });
    }

    function setName(index, name) {
        const trimmed = (name || "").trim();
        if (!_inBounds(index) || !trimmed) return;
        _replace(index, { name: trimmed });
    }

    function toggleEntry(index, dateKey) {
        if (!_inBounds(index)) return;

        const habit = habits[index];
        const current = habit.entries[dateKey] || "";
        // positive: empty -> x -> o -> empty
        // negative: empty(displayed X) -> o -> empty
        const next = habit.negative
            ? (current === "o" ? "" : "o")
            : (current === "" ? "x" : current === "x" ? "o" : "");

        const entries = Object.assign({}, habit.entries);
        if (next) entries[dateKey] = next;
        else delete entries[dateKey];

        _replace(index, { entries: entries });
    }
}
