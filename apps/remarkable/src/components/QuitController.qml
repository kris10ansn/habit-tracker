import QtQuick 2.15

Item {
    id: controller

    property var habitsStore
    property var settingsStore
    property var syncStore
    property var powerImages
    property bool quitting: false
    property string errorMessage: ""
    property bool _handingOff: false
    signal readyToClose

    Timer {
        id: waitForSaves
        interval: 100
        onTriggered: controller.advance()
    }

    function requestQuit() {
        if (quitting) {
            return;
        }

        errorMessage = "";
        quitting = true;
        powerImages.beginQuit();
        habitsStore.flushPendingSave();
        settingsStore.flushPendingSave();
        syncStore.flushPendingSave();
        if (!syncStore.hasSyncedSuccessfully) {
            syncStore.abortSync();
        }
        advance();
    }

    function advance() {
        if (!quitting || _handingOff) {
            return;
        }

        const syncPending = syncStore.isRequestInFlight || syncStore.status === "pending";
        const savePending = habitsStore.hasPendingSave || settingsStore.hasPendingSave || syncStore.hasPendingSave;
        if (syncPending || savePending || !powerImages.canHandOff) {
            waitForSaves.restart();
            return;
        }

        const saveError = habitsStore.lastSaveError || settingsStore.lastSaveError || syncStore.lastSaveError;
        if (saveError) {
            fail("Could not save your changes. The app is still open.\n\n" + saveError);
            return;
        }

        _handingOff = true;
        powerImages.finishInBackground(result => {
            _handingOff = false;
            if (result.superseded) {
                waitForSaves.restart();
                return;
            }
            if (!result.ok) {
                fail(result.error || "Could not hand image saving to the background writer");
                return;
            }
            readyToClose();
        });
    }

    function fail(message) {
        errorMessage = message;
        quitting = false;
        powerImages.cancelQuit();
    }
}
