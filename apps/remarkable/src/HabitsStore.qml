import QtQuick 2.15
import "js/Storage.js" as Storage
import "js/habits.js" as DefaultHabits
import "js/HabitsModel.js" as HabitsModel
import "js/DateUtils.js" as DateUtils
import "js/Entries.js" as Entries
import "js/Polarity.js" as Polarity
import "js/Ids.js" as Ids

// Facade over month-partitioned persistence. Keeps the public store API
// (habits, isLoaded, the mutators) but splits storage across two files: a
// roster (identity + config + habit tombstones) and the viewed month's entry
// rows. The ListModel is the single in-memory source of truth; each child store
// serializes a projection of it (see HabitsModel). Config edits save the roster;
// entry toggles save the month.
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

    // Alive habits only, in display order. A deleted habit leaves the model and lives on in
    // habitTombstones, so every index-based API here stays in step with what the grid renders.
    property ListModel habits: ListModel {
        dynamicRoles: true
    }

    // Soft-deleted habits, in roster-row shape with deletedAt set. Persisted alongside the alive
    // rows in roster.json — the same "alive rows + tombstones" split the sync wire format uses —
    // and dropped once a sync confirms the server owns them.
    property var habitTombstones: []

    readonly property bool isLoaded: _roster.isLoaded && _month.isLoaded

    // Sticky: true once the first load ever completes, and never false again — even
    // while a month switch briefly drops isLoaded to tear the grid down. The month
    // arrows gate on this (not isLoaded) so they stay live across switches.
    property bool hasLoadedOnce: false
    onIsLoadedChanged: if (store.isLoaded)
        store.hasLoadedOnce = true

    signal saved

    property string saveError: ""
    function clearSaveError() {
        store.saveError = "";
    }

    // Load is parallel; the month's entry rows are folded onto habits by id once both
    // files have resolved, in whichever order they arrive.
    property bool _rosterApplied: false
    property bool _monthApplied: false
    property var _pendingEntriesByHabitId: ({})

    property JsonStore _roster: JsonStore {
        filePath: store.dataDir + "/roster.json"
        serialize: function () {
            return {
                habits: HabitsModel.toRoster(store.habits).concat(store.habitTombstones)
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
                entries: HabitsModel.toMonthEntryRows(store.habits)
            };
        }
        applyLoaded: function (data) {
            store._applyMonth(data);
        }
        onSaved: store.saved()
        onSaveFailed: store.saveError = message
    }

    // The one place a stored or synced habit becomes a model row, so field defaults and the
    // tolerance for pre-polarity rosters live in a single spot.
    function _modelItem(habit) {
        const createdAt = habit.createdAt || Date.now();

        return {
            id: habit.id || Ids.newId(),
            name: habit.name,
            polarity: Polarity.fromHabit(habit),
            hideFromSleep: !!habit.hideFromSleep,
            createdAt: createdAt,
            updatedAt: habit.updatedAt || createdAt,
            deletedAt: null,
            entriesByDate: habit.entriesByDate || ({})
        };
    }

    function _applyRoster(data) {
        const hasRoster = data && Array.isArray(data.habits);
        const stored = hasRoster ? data.habits : DefaultHabits.habits;

        const items = stored.filter(habit => !habit.deletedAt).map(habit => store._modelItem(habit));
        store.habitTombstones = stored.filter(habit => !!habit.deletedAt).map(habit => store._tombstoneRow(habit));

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

    function _tombstoneRow(habit) {
        const row = HabitsModel.rosterRow(store._modelItem(habit));
        row.deletedAt = habit.deletedAt;

        return row;
    }

    function _applyMonth(data) {
        const stored = data && data.entries;
        const rows = Array.isArray(stored) ? stored : Entries.rowsFromLegacyMonth(stored);

        store._pendingEntriesByHabitId = Entries.byHabitId(rows);
        store._monthApplied = true;
        store._fold();
    }

    function _fold() {
        if (!store._rosterApplied || !store._monthApplied) {
            return;
        }

        const entriesByHabitId = store._pendingEntriesByHabitId || {};
        for (let i = 0; i < store.habits.count; i++) {
            const id = store.habits.get(i).id;
            store.habits.setProperty(i, "entriesByDate", entriesByHabitId[id] || ({}));
        }
    }

    function _inBounds(i) {
        return i >= 0 && i < habits.count;
    }

    function add(name, polarity) {
        const trimmed = (name || "").trim();
        if (!trimmed) {
            return;
        }

        habits.append(store._modelItem({
            name: trimmed,
            polarity: polarity
        }));

        _roster.scheduleSave();
    }

    function move(from, to) {
        if (!_inBounds(from) || !_inBounds(to) || from === to) {
            return;
        }

        habits.move(from, to, 1);

        // Position is the array index at sync time, so every habit whose index shifted needs a
        // fresh edit-time for the reorder to win last-write-wins.
        const now = Date.now();
        for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
            habits.setProperty(i, "updatedAt", now);
        }

        _roster.scheduleSave();
    }

    // Soft delete: the habit leaves the model (so the grid and every index-based API forget it)
    // and becomes a roster tombstone the next sync pushes, so the delete can win a merge instead
    // of being resurrected by another client's stale copy.
    function remove(index) {
        if (!_inBounds(index)) {
            return;
        }

        const deletedAt = Date.now();
        const tombstone = HabitsModel.rosterRow(habits.get(index));
        tombstone.updatedAt = deletedAt;
        tombstone.deletedAt = deletedAt;

        store.habitTombstones = store.habitTombstones.concat([tombstone]);
        habits.remove(index);

        _roster.scheduleSave();
    }

    // The server owns the pushed tombstones now, so stop resending them.
    function purgeHabitTombstones() {
        if (store.habitTombstones.length === 0) {
            return;
        }

        store.habitTombstones = [];
        store._roster.scheduleSave();
    }

    function togglePolarity(index) {
        if (!_inBounds(index)) {
            return;
        }
        habits.setProperty(index, "polarity", Polarity.toggled(habits.get(index).polarity));
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
        const entriesByDate = habit.entriesByDate || {};
        const row = Entries.toggledRow(habit.id, dateKey, habit.polarity, entriesByDate[dateKey]);

        habits.setProperty(index, "entriesByDate", Entries.withRow(entriesByDate, row));
        _month.scheduleSave();
    }

    // Overwrite local state with the authoritative result of a sync: rebuild the
    // roster in the server's order and replace the viewed month's entries. Persists both
    // files immediately.
    function applySynced(roster, entriesByHabitId) {
        // hideFromSleep and createdAt are device-local — the wire format carries neither — so they
        // are read off the current model before it is cleared and carried onto the new rows.
        const localById = {};
        for (let i = 0; i < habits.count; i++) {
            const habit = habits.get(i);
            localById[habit.id] = {
                hideFromSleep: !!habit.hideFromSleep,
                createdAt: habit.createdAt
            };
        }

        const items = (roster || []).map(habit => {
                const local = localById[habit.id] || {};
                return store._modelItem({
                    id: habit.id,
                    name: habit.name,
                    polarity: habit.polarity,
                    hideFromSleep: local.hideFromSleep,
                    createdAt: local.createdAt,
                    updatedAt: habit.updatedAt,
                    entriesByDate: (entriesByHabitId || {})[habit.id] || ({})
                });
            });

        store.habits.clear();
        if (items.length > 0) {
            store.habits.append(items);
        }

        store.habitTombstones = [];

        store._roster._doSave();
        store._month._doSave();
    }

    // Tear the grid Loader down now (drop the month store's isLoaded) so the
    // "Loading…" screen paints this frame — the instant half of a month switch.
    // The blocking read is deferred by the caller and runs in loadMonth (ADR 0004).
    function beginLoadMonth() {
        store._month.isLoaded = false;
    }

    // Swap the in-memory entries to another month's file. Flush any pending edit
    // to the *old* file first (filePath still points there until viewYear/Month
    // change), then re-point and re-read, folding the new month's entry rows onto the
    // roster. The roster (identity/config) is month-independent and stays put.
    //
    // This holds the blocking read, so the caller defers it past the teardown paint
    // (see Main.goToMonth). reload restores isLoaded to true, rebuilding the grid
    // async against the new month. No same-month early-return: after a teardown the
    // read must run to restore isLoaded even when the viewed month is unchanged
    // (e.g. hopping forward then back before the deferred load fires).
    function loadMonth(year, month) {
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
