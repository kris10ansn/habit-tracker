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
    // the in-flight request phases mirroring the XHR readyState — "syncing" (started), "connecting"
    // (OPENED), "receiving" (HEADERS_RECEIVED / LOADING) — then a terminal "ok", "offline", "error".
    // Only "error" (misconfig) is surfaced loudly; the rest stay quiet.
    property string status: ""
    property string errorMessage: ""
    property int remainingSeconds: 0
    property bool hasSyncedSuccessfully: false

    // True while a request is on the wire, across every readyState phase. The syncing guards key on
    // this rather than a single status string so the finer phases don't slip past them.
    readonly property bool isRequestInFlight: ["syncing", "connecting", "receiving"].indexOf(status) !== -1

    // Text for the ambient status line (ADR 0003). Quiet by design: empty while standalone (no
    // server configured), a brief phrase otherwise. Loud misconfig errors are a modal in Main.
    readonly property string statusText: syncStore._statusText()

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
        if (syncStore.isRequestInFlight) {
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
        const requestMonthKey = syncStore.monthKey;
        const request = Sync.buildRequest(roster, monthEntries, requestMonthKey, syncStore.habitTombstones);

        syncStore._send(syncStore._endpoint(url), request, requestMonthKey);
    }

    function _send(endpoint, request, requestMonthKey) {
        const xhr = new XMLHttpRequest();
        syncStore._activeXhr = xhr;

        xhr.onreadystatechange = function () {
            if (syncStore._activeXhr !== xhr) {
                return;
            }

            if (xhr.readyState !== XMLHttpRequest.DONE) {
                syncStore.status = syncStore._statusForReadyState(xhr.readyState);
                return;
            }

            syncStore._activeXhr = null;
            syncStore._timeoutTimer.stop();
            syncStore._handleDone(xhr, request, requestMonthKey);
        };

        xhr.open("POST", endpoint);
        xhr.setRequestHeader("Content-Type", "application/json");
        syncStore._timeoutTimer.restart();
        xhr.send(JSON.stringify(request));
    }

    function _statusForReadyState(readyState) {
        if (readyState === XMLHttpRequest.HEADERS_RECEIVED || readyState === XMLHttpRequest.LOADING) {
            return "receiving";
        }

        return "connecting";
    }

    function _handleDone(xhr, request, requestMonthKey) {
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

        // The user navigated to a different month while this request was in flight.
        // The response describes requestMonthKey, not what's on screen — applying it
        // would fold one month's entries onto another. Drop it; the arrival sync for
        // the now-viewed month reconciles, and unpushed tombstones resend next round.
        if (syncStore.monthKey !== requestMonthKey) {
            syncStore.status = "";
            return;
        }

        if (Sync.responseChangesLocal(request, response)) {
            const applied = Sync.applyResponse(response, requestMonthKey);
            syncStore.habitsStore.applySynced(applied.roster, applied.entriesByHabitId);
        }

        // The server now owns the tombstones we pushed, so drop them locally.
        syncStore.habitTombstones = [];
        syncStore.lastSyncedAt = Date.now();
        syncStore.errorMessage = "";
        syncStore.status = "ok";
        syncStore.hasSyncedSuccessfully = true;
        syncStore.scheduleSave();
    }

    function abortSync() {
        syncStore._syncTimer.stop();
        syncStore._tickTimer.stop();
        syncStore._timeoutTimer.stop();
        syncStore.remainingSeconds = 0;

        const xhr = syncStore._activeXhr;
        syncStore._activeXhr = null;
        if (xhr) {
            xhr.abort();
        }

        if (syncStore.isRequestInFlight || syncStore.status === "pending") {
            syncStore.status = "";
        }
    }

    function _abort() {
        syncStore.abortSync();
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

    function _statusText() {
        if (!syncStore._serverUrl()) {
            return "";
        }

        if (syncStore.status === "pending") {
            return syncStore.remainingSeconds > 0
                ? `Syncing in ${syncStore.remainingSeconds}s`
                : "Syncing…";
        }

        if (syncStore.status === "syncing") return "Syncing…";
        if (syncStore.status === "connecting") return "Connecting…";
        if (syncStore.status === "receiving") return "Receiving…";
        if (syncStore.status === "offline") return "Sync failed";
        if (syncStore.status === "error") return "Sync error";

        if (syncStore.lastSyncedAt > 0) return "Synced to server";

        return "";
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
