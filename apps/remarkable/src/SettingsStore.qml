import QtQuick 2.15
import "js/BuildProfile.js" as BuildProfile

JsonStore {
    id: settingsStore
    saveDelayMs: 0

    filePath: BuildProfile.settingsPath

    // Whether the app writes the grid to the available power-state images.
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

    // A zero-delay save coalesces same-tick setters while remaining visible to Quit's
    // pending-save guard before the event loop runs the write.
    function _saveCoalesced() {
        settingsStore.scheduleSave();
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
