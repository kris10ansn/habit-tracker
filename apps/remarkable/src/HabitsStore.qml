import QtQuick 2.15
import "js/Storage.js" as Storage
import "js/habits.js" as DefaultHabits
import "js/HabitsModel.js" as HabitsModel
import "js/DateUtils.js" as DateUtils
import "js/Ids.js" as Ids

// Facade over month-partitioned persistence. Keeps the public store API
// (habits, isLoaded, the mutators) but splits storage across two files: a
// roster (identity + config) and the current month's entries. The ListModel is
// the single in-memory source of truth; each child store serializes a
// projection of it (see HabitsModel). Config edits save the roster; entry
// toggles save the month.
QtObject {
    id: store

    readonly property string dataDir: "/home/root/xovi/exthome/appload/habit-tracker/data"
    property date today: new Date()

    // The month the grid is currently viewing. Starts on the real current month;
    // month navigation re-points it (see loadMonth). monthKey — and thus the month
    // file path and the sync unit — follow it.
    property int viewYear: today.getFullYear()
    property int viewMonth: today.getMonth()
    readonly property string monthKey: DateUtils.monthKey(viewYear, viewMonth)

    property ListModel habits: ListModel {
        dynamicRoles: true
    }

    readonly property bool isLoaded: _roster.isLoaded && _month.isLoaded
    signal saved

    // Emitted before a habit leaves the roster so the sync layer can keep a tombstone (ADR 0003).
    signal habitRemoved(string id)

    property string saveError: ""
    function clearSaveError() {
        store.saveError = "";
    }

    // Load is parallel; the month entries are folded onto habits by id once both
    // files have resolved, in whichever order they arrive.
    property bool _rosterApplied: false
    property bool _monthApplied: false
    property var _pendingMonthEntries: ({})

    property JsonStore _roster: JsonStore {
        filePath: store.dataDir + "/roster.json"
        serialize: function () {
            return {
                habits: HabitsModel.toRoster(store.habits)
            };
        }
        applyLoaded: function (data) {
            store._applyRoster(data);
        }
        onSaved: store.saved()
        onSaveFailed: store.saveError = message
    }

    property JsonStore _month: JsonStore {
        filePath: store.dataDir + "/" + store.monthKey + ".json"
        serialize: function () {
            return {
                month: store.monthKey,
                entries: HabitsModel.toMonthEntries(store.habits)
            };
        }
        applyLoaded: function (data) {
            store._applyMonth(data);
        }
        onSaved: store.saved()
        onSaveFailed: store.saveError = message
    }

    function _modelItem(habit) {
        return {
            id: habit.id || Ids.newId(),
            name: habit.name,
            negative: !!habit.negative,
            hideFromSleep: !!habit.hideFromSleep,
            updatedAt: habit.updatedAt || Date.now(),
            entries: {}
        };
    }

    function _applyRoster(data) {
        const hasRoster = data && Array.isArray(data.habits);
        const items = (hasRoster ? data.habits : DefaultHabits.habits).map(h => store._modelItem(h));

        // Bulk append — one rowsInserted vs N avoids per-row e-ink flash.
        store.habits.clear();
        if (items.length > 0) {
            store.habits.append(items);
        }

        store._rosterApplied = true;
        store._fold();

        if (hasRoster) {
            return;
        }

        if (Storage.isCorrupt(data)) {
            console.warn("HabitsStore: refusing to overwrite corrupt roster at", store._roster.filePath, "- using defaults in memory only");
            return;
        }

        store._roster._doSave();
    }

    function _applyMonth(data) {
        const entries = (data && data.entries && typeof data.entries === "object") ? data.entries : ({});

        store._pendingMonthEntries = entries;
        store._monthApplied = true;
        store._fold();
    }

    function _fold() {
        if (!store._rosterApplied || !store._monthApplied) {
            return;
        }

        const entries = store._pendingMonthEntries || {};
        for (let i = 0; i < store.habits.count; i++) {
            const id = store.habits.get(i).id;
            store.habits.setProperty(i, "entries", entries[id] || ({}));
        }
    }

    function _inBounds(i) {
        return i >= 0 && i < habits.count;
    }

    function _nextEntryState(habitNegative, currentState) {
        // positive habit: empty -> x -> o -> empty
        // negative habit (displays X as default): empty(X) -> o -> empty(X)
        return habitNegative
            ? (currentState === "o" ? "" : "o")
            : (currentState === "" ? "x" : currentState === "x" ? "o" : "");
    }

    function add(name, negative) {
        const trimmed = (name || "").trim();
        if (!trimmed) {
            return;
        }

        habits.append({
            id: Ids.newId(),
            name: trimmed,
            negative: !!negative,
            hideFromSleep: false,
            updatedAt: Date.now(),
            entries: {}
        });

        _roster.scheduleSave();
    }

    function move(from, to) {
        if (!_inBounds(from) || !_inBounds(to) || from === to) {
            return;
        }

        habits.move(from, to, 1);

        // Position is the array index at sync time, so every habit whose index shifted needs a
        // fresh edit-time for the reorder to win last-write-wins (ADR 0003).
        const now = Date.now();
        for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
            habits.setProperty(i, "updatedAt", now);
        }

        _roster.scheduleSave();
    }

    function remove(index) {
        if (!_inBounds(index)) {
            return;
        }
        store.habitRemoved(habits.get(index).id);
        habits.remove(index);
        _roster.scheduleSave();
    }

    function setNegative(index, negative) {
        if (!_inBounds(index)) {
            return;
        }
        habits.setProperty(index, "negative", !!negative);
        habits.setProperty(index, "updatedAt", Date.now());
        _roster.scheduleSave();
    }

    function setHideFromSleep(index, hidden) {
        if (!_inBounds(index)) {
            return;
        }
        habits.setProperty(index, "hideFromSleep", !!hidden);
        _roster.scheduleSave();
    }

    function setName(index, name) {
        const trimmed = (name || "").trim();
        if (!_inBounds(index) || !trimmed) {
            return;
        }
        habits.setProperty(index, "name", trimmed);
        habits.setProperty(index, "updatedAt", Date.now());
        _roster.scheduleSave();
    }

    function toggleEntry(index, dateKey) {
        if (!_inBounds(index)) {
            return;
        }

        const habit = habits.get(index);
        const currentEntries = habit.entries || {};
        const cell = currentEntries[dateKey];
        const current = cell && cell.state ? cell.state : "";
        const next = store._nextEntryState(habit.negative, current);

        // A cleared cell stays inline as { state: "", updatedAt } — a tombstone the next sync
        // sends, not a deleted key (ADR 0003). It renders as Unmarked and is pruned when sync overwrites.
        const entries = Object.assign({}, currentEntries);
        entries[dateKey] = {
            state: next,
            updatedAt: Date.now()
        };

        habits.setProperty(index, "entries", entries);
        _month.scheduleSave();
    }

    // Overwrite local state with the authoritative result of a sync (ADR 0003): rebuild the
    // roster in the server's order and replace the current month's entries, preserving the
    // device-only suspend visibility the server never sees. Persists both files immediately.
    function applySynced(roster, entriesByHabitId) {
        const hideById = {};
        for (let i = 0; i < habits.count; i++) {
            const habit = habits.get(i);
            hideById[habit.id] = !!habit.hideFromSleep;
        }

        const items = (roster || []).map(habit => ({
                    id: habit.id,
                    name: habit.name,
                    negative: !!habit.negative,
                    hideFromSleep: !!hideById[habit.id],
                    updatedAt: habit.updatedAt,
                    entries: (entriesByHabitId || {})[habit.id] || ({})
                }));

        store.habits.clear();
        if (items.length > 0) {
            store.habits.append(items);
        }

        store._roster._doSave();
        store._month._doSave();
    }

    // Swap the in-memory entries to another month's file. Flush any pending edit
    // to the *old* file first (filePath still points there until viewYear/Month
    // change), then re-point and re-read, folding the new month's entries onto the
    // roster. The roster (identity/config) is month-independent and stays put.
    function loadMonth(year, month) {
        if (year === store.viewYear && month === store.viewMonth) {
            return;
        }

        store._month.flushPendingSave();

        store.viewYear = year;
        store.viewMonth = month;

        store._monthApplied = false;
        store._month.reload();
    }

    function flushPendingSave() {
        _roster.flushPendingSave();
        _month.flushPendingSave();
    }
}
