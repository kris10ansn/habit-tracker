import QtQuick 2.15
import "." as App
import "components" as App
import "js/DateUtils.js" as DateUtils
import "js/BuildProfile.js" as BuildProfile
import "js/HabitEdits.js" as HabitEdits
import "js/SuspendStatus.js" as SuspendStatus

Rectangle {
    id: root
    anchors.fill: parent
    color: App.Theme.bg

    // Host-only screenshot inputs. Their defaults are the production paths and behavior; the
    // off-device capture tool overrides them before Main is constructed.
    property date today: new Date()
    property string dataDir: BuildProfile.dataDirectory
    property string settingsFilePath: BuildProfile.settingsPath
    property string syncFilePath: dataDir + "/sync.json"
    property string initialView: "grid"
    property bool initialEditing: false
    property bool screenshotMode: false
    property string screenshotPairingStatus: ""
    property string screenshotPairingCode: ""

    readonly property bool screenshotReady: habitsStore.isLoaded && settingsStore.isLoaded
        && syncStore.isLoaded && (!root.initialEditing || editSession.active)
        && (landscape.currentView === "settings" || landscape.editing || landscape.gridReady)
    readonly property string suspendStatusText: SuspendStatus.text(suspendCanvas.phase, suspendCanvas.remainingSeconds, suspendCanvas.failedPath)

    signal close

    function _waitForPendingOperations() {
        const syncInProgress = syncStore.isRequestInFlight || syncStore.status === "pending";
        const renderInProgress = suspendCanvas.busy || suspendCanvas.phase === "saving" || suspendCanvas.phase === "pending";

        if (syncInProgress || renderInProgress) {
            Qt.callLater(() => root._waitForPendingOperations());
            return;
        }

        root.close();
    }

    function quit() {
        habitsStore.flushPendingSave();
        settingsStore.flushPendingSave();
        syncStore.flushPendingSave();

        if (landscape.canRenderSuspend) {
            suspendCanvas.renderAsync();
        }

        if (!syncStore.hasSyncedSuccessfully) {
            syncStore.abortSync();
        }

        root._waitForPendingOperations();
    }

    // Teardown flushes local state only — deliberately never syncs. A network round-trip here has
    // no frame left to report into and no way to apply the merged response, so a sync on quit can
    // only lose the result. Pending edits reach the server on the next launch's load-sync instead.
    function unloading() {
        console.log("Habit Tracker unloading");
        habitsStore.flushPendingSave();
        settingsStore.flushPendingSave();
        syncStore.flushPendingSave();
        if (landscape.canRenderSuspend)
            suspendCanvas.renderSync();
    }

    // Sync once both the habits and the sync sidecar have loaded — never before, or a first sync
    // could miss pending tombstones. Guarded to run once per launch.
    property bool _syncedOnLoad: false
    function _maybeSyncOnLoad() {
        if (root.screenshotMode || root._syncedOnLoad || !habitsStore.isLoaded || !syncStore.isLoaded)
            return;

        root._syncedOnLoad = true;
        syncStore.syncNow();
    }

    function applySuspendSetting(enabled) {
        if (BuildProfile.isTest) {
            settingsStore.setSuspendImageEnabled(enabled);
            return;
        }

        suspendCanvas.backup(ok => {
            if (!ok) return;
            if (enabled) {
                suspendCanvas.restorationPending = false;
                settingsStore.setSuspendImageEnabled(true);
                return;
            }
            suspendCanvas.restore(restored => {
                if (restored) settingsStore.setSuspendImageEnabled(false);
            });
        });
    }

    property bool _initialEditStarted: false
    function _maybeStartInitialEditing() {
        if (root.initialEditing && !root._initialEditStarted && habitsStore.isLoaded && settingsStore.isLoaded) {
            root._initialEditStarted = true;
            landscape.beginEditing();
        }
    }

    Component.onCompleted: console.log("Habit Tracker loaded; size:", width, "x", height)

    App.HabitsStore {
        id: habitsStore
        dataDir: root.dataDir
        today: root.today
    }

    App.HabitEditSession {
        id: editSession
    }

    App.SettingsStore {
        id: settingsStore
        filePath: root.settingsFilePath
    }

    App.SyncStore {
        id: syncStore
        filePath: root.syncFilePath
        habitsStore: habitsStore
        settingsStore: settingsStore
        monthKey: habitsStore.monthKey
    }

    // Polls only while the settings page is on screen — a 3-second timer ticking behind a hidden
    // page would waste battery and wake e-ink hardware no one is looking at.
    App.PairingStore {
        id: pairingStore
        settingsStore: settingsStore
        active: !root.screenshotMode && landscape.currentView === "settings"
    }

    App.SuspendCanvas {
        id: suspendCanvas
        habits: habitsStore.habits
        today: root.today
        renderAllowed: landscape.canRenderSuspend && landscape.gridReady && !landscape.editing
    }

    Connections {
        target: habitsStore
        function onSaved() {
            if (!landscape.editing && landscape.canRenderSuspend)
                suspendCanvas.scheduleRender();
            syncStore.scheduleSync();
        }
        function onIsLoadedChanged() {
            root._maybeSyncOnLoad();
            root._maybeStartInitialEditing();
        }
    }

    Connections {
        target: syncStore
        function onIsLoadedChanged() {
            root._maybeSyncOnLoad();
        }
    }

    // Render once the feature becomes enabled — covers both the Settings commit
    // and settings.json loading after the grid is already built.
    Connections {
        target: settingsStore
        function onIsLoadedChanged() {
            root._maybeStartInitialEditing();
        }
        function onSuspendImageEnabledChanged() {
            if (landscape.canRenderSuspend && landscape.gridReady && !landscape.editing)
                suspendCanvas.renderAsync();
        }
    }

    Item {
        id: landscape
        anchors.centerIn: parent
        width: parent.height
        height: parent.width
        rotation: 90

        property date today: root.today
        property int currentDay: today.getDate()
        property int currentYear: today.getFullYear()
        property int currentMonth: today.getMonth()
        readonly property bool editing: currentView === "edit"
        property string currentView: root.initialView

        // The month on screen. Starts on the real current month; the header arrows
        // move it. The grid, the day count, and (via habitsStore) the loaded entries
        // and sync unit all follow it. Only the real current month highlights today
        // and drives the suspend image.
        property int viewYear: currentYear
        property int viewMonth: currentMonth
        readonly property bool isCurrentMonth: viewYear === currentYear && viewMonth === currentMonth
        readonly property bool viewIsAfterCurrent: viewYear > currentYear || (viewYear === currentYear && viewMonth > currentMonth)
        readonly property date viewDate: isCurrentMonth ? today : new Date(viewYear, viewMonth, 1)
        property int daysInMonth: DateUtils.daysInMonth(viewDate)

        readonly property int highlightDay: isCurrentMonth ? currentDay : 0
        readonly property int lastNonFutureDay: isCurrentMonth ? currentDay : (viewIsAfterCurrent ? 0 : daysInMonth)

        // The precondition every suspend render shares: the feature is on, the real current month
        // is on screen, and the grid is showing what is actually on disk — an unreadable file
        // renders as an empty month, which must never reach the suspend image.
        readonly property bool canRenderSuspend: !root.screenshotMode && settingsStore.suspendImageEnabled && isCurrentMonth && !habitsStore.hasUnreadableData

        // Tear the grid down and repoint the header this frame for instant feedback,
        // then defer the blocking month read past the paint (mirrors the deferred
        // first-open read). Qt.callLater dedups, so rapid hops collapse to a single
        // load of the final month; _loadViewedMonth reads whatever month is on screen.
        function goToMonth(year, month) {
            if (landscape.viewYear === year && landscape.viewMonth === month)
                return;

            habitsStore.beginLoadMonth();
            landscape.viewYear = year;
            landscape.viewMonth = month;

            Qt.callLater(landscape._loadViewedMonth);
        }

        function _loadViewedMonth() {
            habitsStore.loadMonth(landscape.viewYear, landscape.viewMonth);
            landscape.recenterScroll();

            // Pull the arrived-at month from the server (no-op when standalone).
            syncStore.syncNow();

            if (!landscape.canRenderSuspend) {
                // A render debounced against the current month must not fire now that the model
                // holds another month — or a month that could not be read.
                suspendCanvas.cancelPending();
                return;
            }

            // Back on the current month: refresh the suspend image if it drifted
            // while we were away (e.g. suspend enabled mid-browse). scheduleRender
            // self-dedups, so an unchanged current month costs nothing.
            if (!landscape.editing)
                suspendCanvas.scheduleRender();
        }

        function goToPreviousMonth() {
            const previous = new Date(landscape.viewYear, landscape.viewMonth - 1, 1);
            landscape.goToMonth(previous.getFullYear(), previous.getMonth());
        }

        function goToNextMonth() {
            const next = new Date(landscape.viewYear, landscape.viewMonth + 1, 1);
            landscape.goToMonth(next.getFullYear(), next.getMonth());
        }

        function goToCurrentMonth() {
            landscape.goToMonth(landscape.currentYear, landscape.currentMonth);
        }

        function recenterScroll() {
            if (gridLoader.item) gridLoader.item.recenter();
        }

        function beginEditing() {
            editSession.begin(habitsStore.habits, settingsStore.showPrivateHabits);
            landscape.currentView = "edit";
        }

        function finishEditing() {
            habitsStore.applyHabitEdits(editSession.original, HabitEdits.snapshot(editSession.habits));
            landscape.currentView = "grid";
            editSession.finish();
        }

        onEditingChanged: if (!editing && landscape.canRenderSuspend) suspendCanvas.renderAsync()
        readonly property bool gridReady: gridLoader.status === Loader.Ready

        Loader {
            id: gridLoader
            anchors.fill: parent
            asynchronous: true
            active: habitsStore.isLoaded
            visible: status === Loader.Ready && landscape.currentView === "grid"
            onLoaded: if (landscape.canRenderSuspend && !landscape.editing) suspendCanvas.renderAsync()
            sourceComponent: App.TrackerPage {
                habits: habitsStore.habits
                buildLabel: BuildProfile.isTest ? "TEST · separate local data" : ""
                showPrivateHabits: settingsStore.showPrivateHabits
                date: landscape.viewDate
                isCurrentMonth: landscape.isCurrentMonth
                daysInMonth: landscape.daysInMonth
                highlightDay: landscape.highlightDay
                lastNonFutureDay: landscape.lastNonFutureDay
                year: landscape.viewYear
                month: landscape.viewMonth
                suspendStatusText: root.suspendStatusText
                syncStatusText: syncStore.statusText
                onPreviousRequested: landscape.goToPreviousMonth()
                onNextRequested: landscape.goToNextMonth()
                onCurrentRequested: landscape.goToCurrentMonth()
                onEditRequested: landscape.beginEditing()
                onSettingsRequested: landscape.currentView = "settings"
                onQuitRequested: root.quit()
                onEntryToggled: habitsStore.toggleEntry(index, dateKey)
            }
        }

        Item {
            anchors.fill: parent
            visible: !landscape.gridReady && landscape.currentView === "grid"
            App.MonthNavHeader {
                x: App.Theme.margin
                y: App.Theme.margin
                date: landscape.viewDate
                isCurrentMonth: landscape.isCurrentMonth
                disabled: !habitsStore.hasLoadedOnce
                onPreviousRequested: landscape.goToPreviousMonth()
                onNextRequested: landscape.goToNextMonth()
                onCurrentRequested: landscape.goToCurrentMonth()
            }
            Text {
                anchors.centerIn: parent
                text: "Loading…"
                font.pixelSize: App.Theme.titleFont
                color: App.Theme.fg
            }
        }

        App.HabitEditorPage {
            anchors.fill: parent
            visible: landscape.editing
            habits: editSession.habits
            syncStatusText: syncStore.statusText
            suspendStatusText: root.suspendStatusText
            onNameEdited: editSession.setName(index, name)
            onPolarityToggled: editSession.togglePolarity(index)
            onPrivateToggled: editSession.togglePrivate(index)
            onMoveRequested: editSession.move(index, direction)
            onRemoveRequested: editSession.remove(index)
            onAddRequested: editSession.add(name, polarity)
            onDoneRequested: landscape.finishEditing()
            onCancelRequested: {
                landscape.currentView = "grid";
                editSession.finish();
            }
        }

        App.SettingsPage {
            anchors.fill: parent
            visible: landscape.currentView === "settings"
            suspendImageEnabled: settingsStore.suspendImageEnabled
            suspendImageBusy: suspendCanvas.busy
            showPrivateHabits: settingsStore.showPrivateHabits
            serverUrl: settingsStore.serverUrl
            syncStatusText: syncStore.statusText
            pairingConnected: settingsStore.token !== ""
            pairingStatus: root.screenshotMode ? root.screenshotPairingStatus : pairingStore.status
            pairingCode: root.screenshotMode ? root.screenshotPairingCode : pairingStore.code
            pairingErrorMessage: pairingStore.errorMessage
            onDeveloperRequested: landscape.currentView = "developer"
            onApplyRequested: root.applySuspendSetting(value)
            onShowPrivateHabitsApplied: settingsStore.setShowPrivateHabits(value)
            onServerUrlApplied: {
                settingsStore.setServerUrl(url);
                syncStore.syncNow();
            }
            onSyncNowRequested: syncStore.syncNow()
            onConnectRequested: pairingStore.requestCode()
            onDisconnectRequested: pairingStore.disconnect()
            onBackRequested: landscape.currentView = "grid"
        }

        Loader {
            id: developerTools
            anchors.fill: parent
            active: BuildProfile.isTest && landscape.currentView === "developer"
            visible: landscape.currentView === "developer"
            source: "testing/DeveloperTools.qml"
            onLoaded: {
                item.habits = Qt.binding(() => habitsStore.habits);
                item.canRender = Qt.binding(() => !root.screenshotMode && landscape.isCurrentMonth && habitsStore.isLoaded && !habitsStore.hasUnreadableData);
                item.dataDirectory = Qt.binding(() => root.dataDir);
            }
        }

        Connections {
            target: developerTools.item
            function onBackRequested() { landscape.currentView = "settings"; }
        }

        App.ConfirmDialog {
            visible: habitsStore.saveError !== ""
            acknowledgeOnly: true
            confirmText: "Dismiss"
            message: "Couldn’t save to storage — your changes are only in memory.\n\n" + habitsStore.saveError
            onConfirmed: habitsStore.clearSaveError()
            onCancelled: habitsStore.clearSaveError()
        }

        App.ConfirmDialog {
            visible: syncStore.status === "error" && syncStore.errorMessage !== ""
            acknowledgeOnly: true
            confirmText: "Dismiss"
            message: "Sync failed: " + syncStore.errorMessage
            onConfirmed: syncStore.clearError()
            onCancelled: syncStore.clearError()
        }
    }
}
