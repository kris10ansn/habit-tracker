import QtQuick 2.15

JsonStore {
    id: settingsStore

    filePath: "/home/root/xovi/exthome/appload/habit-tracker/settings.json"

    // Whether the app overwrites the device suspend image with the grid.
    // Opt-in: off until the user turns it on in Settings.
    property bool suspendImageEnabled: false

    serialize: function () {
        return { suspendImageEnabled: settingsStore.suspendImageEnabled };
    }

    applyLoaded: function (data) {
        if (data && typeof data === "object" && typeof data.suspendImageEnabled === "boolean") {
            settingsStore.suspendImageEnabled = data.suspendImageEnabled;
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
}
