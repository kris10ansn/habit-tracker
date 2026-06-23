import QtQuick 2.15

JsonStore {
    id: settingsStore

    filePath: "/home/root/xovi/exthome/appload/habit-tracker/settings.json"

    // Whether the app overwrites the device suspend image with the grid.
    // Opt-in: off until the user turns it on in Settings.
    property bool suspendImageEnabled: false

    // The backend this client syncs with. Empty = standalone (no sync attempts). See ADR 0003.
    property string serverUrl: ""

    serialize: function () {
        return {
            suspendImageEnabled: settingsStore.suspendImageEnabled,
            serverUrl: settingsStore.serverUrl
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
    }

    function setSuspendImageEnabled(value) {
        const next = !!value;
        if (next === settingsStore.suspendImageEnabled) {
            return;
        }

        settingsStore.suspendImageEnabled = next;
        settingsStore._doSave();
    }

    function setServerUrl(value) {
        const next = (value || "").trim();
        if (next === settingsStore.serverUrl) {
            return;
        }

        settingsStore.serverUrl = next;
        settingsStore._doSave();
    }
}
