import QtQuick 2.15
import "js/BuildProfile.js" as BuildProfile

JsonStore {
    id: settingsStore

    filePath: BuildProfile.settingsPath

    // Whether the app writes the grid to all three power-state images.
    // Retain the persisted setting name; this is an extension of the existing opt-in.
    // Opt-in: off until the user turns it on in Settings.
    property bool suspendImageEnabled: false

    // The backend this client syncs with. Empty = standalone (no sync attempts).
    property string serverUrl: ""

    // Reveal private habits on the main grid. Device-local by design — privacy is
    // per-surface, so it never syncs.
    property bool showPrivateHabits: false

    // The bearer token this device paired with, or "" when unpaired. Plaintext on-device is an
    // accepted trade-off (see AUTH_PLAN.md) — the device has no keychain to speak of, and the
    // token is revocable from the phone if the device is ever lost.
    property string token: ""

    serialize: function () {
        return {
            suspendImageEnabled: settingsStore.suspendImageEnabled,
            serverUrl: settingsStore.serverUrl,
            showPrivateHabits: settingsStore.showPrivateHabits,
            token: settingsStore.token
        };
    }

    applyLoaded: function (data) {
        if (!data || typeof data !== "object") {
            return;
        }

        if (typeof data.suspendImageEnabled === "boolean") {
            settingsStore.suspendImageEnabled = data.suspendImageEnabled;
        }
        if (typeof data.serverUrl === "string") {
            settingsStore.serverUrl = data.serverUrl;
        }
        if (typeof data.showPrivateHabits === "boolean") {
            settingsStore.showPrivateHabits = data.showPrivateHabits;
        }
        if (typeof data.token === "string") {
            settingsStore.token = data.token;
        }
    }

    // Settings write through immediately rather than on JsonStore's debounce — a change the
    // user just committed should survive an immediate quit. But the settings commit applies
    // every dirty field in one tick, and overlapping async writes to the same file interleave
    // and corrupt it, so same-tick setter calls coalesce into a single write of the final
    // state (Qt.callLater collapses repeated calls to the same function).
    function _saveCoalesced() {
        Qt.callLater(settingsStore._doSave);
    }

    function setSuspendImageEnabled(value) {
        const next = !!value;
        if (next === settingsStore.suspendImageEnabled) {
            return;
        }

        settingsStore.suspendImageEnabled = next;
        settingsStore._saveCoalesced();
    }

    function setShowPrivateHabits(value) {
        const next = !!value;
        if (next === settingsStore.showPrivateHabits) {
            return;
        }

        settingsStore.showPrivateHabits = next;
        settingsStore._saveCoalesced();
    }

    function setServerUrl(value) {
        const next = (value || "").trim();
        if (next === settingsStore.serverUrl) {
            return;
        }

        settingsStore.serverUrl = next;
        settingsStore._saveCoalesced();
    }

    // Set once, by a successful pairing poll — never user-typed, so no trimming.
    function setToken(value) {
        const next = value || "";
        if (next === settingsStore.token) {
            return;
        }

        settingsStore.token = next;
        settingsStore._saveCoalesced();
    }

    // Disconnect: drops the token from this device only. The session row survives server-side
    // until revoked from the phone's linked-devices list.
    function clearToken() {
        settingsStore.setToken("");
    }
}
