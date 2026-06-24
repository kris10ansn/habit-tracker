import QtQuick 2.15
import "js/HabitsModel.js" as HabitsModel
import "js/Sync.js" as Sync

// Offline-first sync sidecar + engine (ADR 0003). Persists pending habit tombstones and the
// last-sync time to data/sync.json, and runs the one-call merge against the configured server.
// Standalone when no server URL is set: syncNow is a no-op. Reads/writes the habits model via the
// references Main wires in. All network failures are non-fatal — the app keeps running locally.
JsonStore {
    id: syncStore

    // Wired by Main.
    property var habitsStore: null
    property var settingsStore: null
    property string monthKey: ""

    // Persisted sidecar state.
    property var habitTombstones: []
    property double lastSyncedAt: 0

    // Transient status for the ambient line: "" (idle/standalone), "pending" (debounce countdown),
    // "syncing", "ok", "offline", "error". Only "error" (misconfig) is surfaced loudly; the rest
    // stay quiet.
    property string status: ""
    property string errorMessage: ""
    property int remainingSeconds: 0

    serialize: function () {
        return {
            tombstones: syncStore.habitTombstones,
            lastSyncedAt: syncStore.lastSyncedAt
        };
    }

    applyLoaded: function (data) {
        if (!data || typeof data !== "object") {
            return;
        }

        syncStore.habitTombstones = Array.isArray(data.tombstones) ? data.tombstones : [];
        syncStore.lastSyncedAt = typeof data.lastSyncedAt === "number" ? data.lastSyncedAt : 0;
    }

    function addHabitTombstone(id) {
        if (!id) {
            return;
        }

        syncStore.habitTombstones = syncStore.habitTombstones.concat([
            {
                id: id,
                deletedAt: Date.now()
            }
        ]);
        syncStore.scheduleSave();
        syncStore.scheduleSync();
    }

    property Timer _syncTimer: Timer {
        interval: 3000
        repeat: false
        onTriggered: syncStore.syncNow()
    }

    property Timer _tickTimer: Timer {
        interval: 1000
        repeat: true
        onTriggered: syncStore.remainingSeconds = Math.max(0, syncStore.remainingSeconds - 1)
    }

    // QML XMLHttpRequest has no reliable timeout, so a hung request is aborted manually to free
    // the "syncing" guard. The _activeXhr identity check ignores the abort's state-change.
    property var _activeXhr: null
    property Timer _timeoutTimer: Timer {
        interval: 15000
        repeat: false
        onTriggered: syncStore._abort()
    }

    function scheduleSync() {
        if (!syncStore._serverUrl()) {
            return;
        }

        syncStore.status = "pending";
        syncStore.remainingSeconds = syncStore._syncTimer.interval / 1000;
        syncStore._syncTimer.restart();
        syncStore._tickTimer.restart();
    }

    function syncNow() {
        const url = syncStore._serverUrl();
        if (!url) {
            syncStore.status = "";
            return;
        }
        if (syncStore.status === "syncing") {
            return;
        }
        if (!syncStore.habitsStore || !syncStore.habitsStore.isLoaded) {
            return;
        }

        syncStore._syncTimer.stop();
        syncStore._tickTimer.stop();
        syncStore.remainingSeconds = 0;
        syncStore.status = "syncing";

        const roster = HabitsModel.toRoster(syncStore.habitsStore.habits);
        const monthEntries = HabitsModel.toMonthEntries(syncStore.habitsStore.habits);
        const request = Sync.buildRequest(roster, monthEntries, syncStore.monthKey, syncStore.habitTombstones);

        syncStore._send(syncStore._endpoint(url), request);
    }

    function _send(endpoint, request) {
        const xhr = new XMLHttpRequest();
        syncStore._activeXhr = xhr;

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== XMLHttpRequest.DONE || syncStore._activeXhr !== xhr) {
                return;
            }

            syncStore._activeXhr = null;
            syncStore._timeoutTimer.stop();
            syncStore._handleDone(xhr, request);
        };

        xhr.open("POST", endpoint);
        xhr.setRequestHeader("Content-Type", "application/json");
        syncStore._timeoutTimer.restart();
        xhr.send(JSON.stringify(request));
    }

    function _handleDone(xhr, request) {
        if (xhr.status === 0) {
            syncStore._fail("offline", "Couldn’t reach the server");
            return;
        }
        if (xhr.status !== 200) {
            syncStore._fail("error", "Server returned " + xhr.status);
            return;
        }

        const response = syncStore._parse(xhr.responseText);
        if (!response) {
            syncStore._fail("error", "Malformed server response");
            return;
        }

        if (Sync.responseChangesLocal(request, response)) {
            const applied = Sync.applyResponse(response, syncStore.monthKey);
            syncStore.habitsStore.applySynced(applied.roster, applied.entriesByHabitId);
        }

        // The server now owns the tombstones we pushed, so drop them locally.
        syncStore.habitTombstones = [];
        syncStore.lastSyncedAt = Date.now();
        syncStore.errorMessage = "";
        syncStore.status = "ok";
        syncStore.scheduleSave();
    }

    function _abort() {
        const xhr = syncStore._activeXhr;
        syncStore._activeXhr = null;
        if (xhr) {
            xhr.abort();
        }
        syncStore._fail("offline", "Sync timed out");
    }

    function _fail(status, message) {
        syncStore.status = status;
        syncStore.errorMessage = message;
    }

    function clearError() {
        syncStore.errorMessage = "";
        if (syncStore.status === "error") {
            syncStore.status = "";
        }
    }

    function _serverUrl() {
        if (!syncStore.settingsStore) {
            return "";
        }

        const configured = (syncStore.settingsStore.serverUrl || "").trim();
        if (!configured || /^https?:\/\//i.test(configured)) {
            return configured;
        }

        // A scheme-less host (e.g. "192.168.1.50:5000") is treated by Qt's XMLHttpRequest as a
        // local file, which rejects POST with "Unsupported method used on a local file". Default
        // to http:// so the request actually goes over the network.
        return "http://" + configured;
    }

    function _endpoint(url) {
        return url.replace(/\/+$/, "") + "/api/sync";
    }

    function _parse(text) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    }
}
