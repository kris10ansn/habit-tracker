import QtQuick 2.15
import "." as App
import "components" as App
import "js/DateUtils.js" as DateUtils
import "js/Scroll.js" as Scroll
import "js/SuspendStatus.js" as SuspendStatus
import "js/SyncStatus.js" as SyncStatus

Rectangle {
    id: root
    anchors.fill: parent
    color: App.Theme.bg

    readonly property bool hasServerUrl: (settingsStore.serverUrl || "").trim() !== ""
    readonly property string suspendStatusText: SuspendStatus.text(suspendCanvas.phase, suspendCanvas.remainingSeconds)
    readonly property string syncStatusText: SyncStatus.text(syncStore.status, syncStore.lastSyncedAt, hasServerUrl, syncStore.remainingSeconds)

    signal close

    function _waitForPendingOperations() {
        const syncInProgress = syncStore.status === "syncing" || syncStore.status === "pending";
        const renderInProgress = suspendCanvas.phase === "saving" || suspendCanvas.phase === "pending";

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

        if (settingsStore.suspendImageEnabled && landscape.isCurrentMonth) {
            suspendCanvas.renderAsync();
        }

        if (!syncStore.hasSyncedSuccessfully) {
            syncStore.abortSync();
        }

        root._waitForPendingOperations();
    }

    function unloading() {
        console.log("Habit Tracker unloading");
        habitsStore.flushPendingSave();
        settingsStore.flushPendingSave();
        syncStore.flushPendingSave();
        if (settingsStore.suspendImageEnabled && landscape.isCurrentMonth)
            suspendCanvas.renderSync();
    }

    // Sync once both the habits and the sync sidecar have loaded — never before, or a first sync
    // could miss pending tombstones. Guarded to run once per launch (ADR 0003).
    property bool _syncedOnLoad: false
    function _maybeSyncOnLoad() {
        if (root._syncedOnLoad || !habitsStore.isLoaded || !syncStore.isLoaded)
            return;

        root._syncedOnLoad = true;
        syncStore.syncNow();
    }

    function applySuspendSetting(enabled) {
        if (enabled && !suspendCanvas.backup()) {
            return;
        }

        settingsStore.setSuspendImageEnabled(enabled);

        if (!enabled) {
            suspendCanvas.invalidateSignature();
            suspendCanvas.restore();
        }
    }

    Component.onCompleted: console.log("Habit Tracker loaded; size:", width, "x", height)

    App.HabitsStore {
        id: habitsStore
    }

    App.SettingsStore {
        id: settingsStore
    }

    App.SyncStore {
        id: syncStore
        filePath: habitsStore.dataDir + "/sync.json"
        habitsStore: habitsStore
        settingsStore: settingsStore
        monthKey: habitsStore.monthKey
    }

    App.SuspendCanvas {
        id: suspendCanvas
        habits: habitsStore.habits
    }

    Connections {
        target: habitsStore
        function onSaved() {
            if (!landscape.editing && settingsStore.suspendImageEnabled && landscape.isCurrentMonth)
                suspendCanvas.scheduleRender();
            syncStore.scheduleSync();
        }
        function onHabitRemoved(id) {
            syncStore.addHabitTombstone(id);
        }
        function onIsLoadedChanged() {
            root._maybeSyncOnLoad();
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
        function onSuspendImageEnabledChanged() {
            if (settingsStore.suspendImageEnabled && landscape.gridReady && !landscape.editing && landscape.isCurrentMonth)
                suspendCanvas.renderAsync();
        }
    }

    Item {
        id: landscape
        anchors.centerIn: parent
        width: parent.height
        height: parent.width
        rotation: 90

        property date today: new Date()
        property int currentDay: today.getDate()
        property int currentYear: today.getFullYear()
        property int currentMonth: today.getMonth()
        property bool editing: false
        property int pendingDeleteIndex: -1
        property string currentView: "grid"

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

        function goToMonth(year, month) {
            landscape.viewYear = year;
            landscape.viewMonth = month;
            habitsStore.loadMonth(year, month);
            landscape.recenterScroll();

            // Pull the arrived-at month from the server (no-op when standalone).
            syncStore.syncNow();

            if (!landscape.isCurrentMonth) {
                // A render debounced against the current month must not fire now
                // that the model holds another month.
                suspendCanvas.cancelPending();
                return;
            }

            // Back on the current month: refresh the suspend image if it drifted
            // while we were away (e.g. suspend enabled mid-browse). scheduleRender
            // self-dedups, so an unchanged current month costs nothing.
            if (settingsStore.suspendImageEnabled && !landscape.editing)
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
            landscape.scrollX = landscape.isCurrentMonth
                ? Scroll.centerOnDay(landscape.currentDay, landscape.viewportWidth, App.Theme.boxSize, App.Theme.boxSpacing, landscape.maxScrollX)
                : 0;
        }

        onEditingChanged: if (!editing && settingsStore.suspendImageEnabled && isCurrentMonth)
            suspendCanvas.renderAsync()

        property int step: App.Theme.boxSize + App.Theme.boxSpacing
        property int habitsRowWidth: App.Theme.habitsWidth + (editing ? App.Theme.editingExtraWidth : 0)
        property int viewportWidth: width - 2 * App.Theme.margin - habitsRowWidth - App.Theme.labelGap - 2 * App.Theme.buttonWidth - 2 * App.Theme.buttonGap - (canScrollY ? App.Theme.buttonWidth + App.Theme.buttonGap : 0)
        property int contentWidth: daysInMonth * App.Theme.boxSize + (daysInMonth - 1) * App.Theme.boxSpacing
        property int maxScrollX: Math.max(0, contentWidth - viewportWidth)
        property int scrollX: 0

        readonly property bool gridReady: gridLoader.status === Loader.Ready
        readonly property bool loading: !gridReady

        onViewportWidthChanged: recenterScroll()

        // Vertical scrolling for when the habit rows overflow the available height.
        property int viewportHeight: height - 2 * App.Theme.margin - monthHeaderRow.height - App.Theme.quitButtonHeight - 2 * App.Theme.rowSpacing
        property int bodyViewportHeight: viewportHeight - App.Theme.dayLabelHeight - App.Theme.rowSpacing
        property int rowStep: App.Theme.boxSize + App.Theme.rowSpacing
        property int scrollRows: Math.max(1, Math.floor(bodyViewportHeight / rowStep) - 1)
        property int maxScrollY: Math.max(0, (gridLoader.item ? gridLoader.item.bodyContentHeight : 0) - bodyViewportHeight)
        property bool canScrollY: maxScrollY > 0
        property int scrollY: 0

        onMaxScrollYChanged: if (scrollY > maxScrollY)
            scrollY = maxScrollY

        Item {
            id: gridView
            anchors.fill: parent
            visible: landscape.currentView === "grid"

            // Hide keyboard if clicked outside of input
            MouseArea {
                anchors.fill: parent
                z: -1
                onClicked: Qt.inputMethod.hide()
            }

            Column {
                anchors.fill: parent
                anchors.margins: App.Theme.margin
                spacing: App.Theme.rowSpacing

                App.MonthNavHeader {
                    id: monthHeaderRow
                    date: landscape.viewDate
                    isCurrentMonth: landscape.isCurrentMonth
                    warn: suspendCanvas.lastRenderFailed
                    disabled: landscape.loading
                    onPreviousRequested: landscape.goToPreviousMonth()
                    onNextRequested: landscape.goToNextMonth()
                    onCurrentRequested: landscape.goToCurrentMonth()
                }

                Row {
                    spacing: App.Theme.buttonGap

                    App.HabitsColumn {
                        habits: habitsStore.habits
                        editing: landscape.editing
                        suspendImageEnabled: settingsStore.suspendImageEnabled
                        rowWidth: landscape.habitsRowWidth
                        viewportHeight: landscape.viewportHeight
                        scrollY: landscape.scrollY
                        onRemoveRequested: landscape.pendingDeleteIndex = index
                        onNegativeToggled: habitsStore.setNegative(index, !habitsStore.habits.get(index).negative)
                        onHideFromSleepToggled: habitsStore.setHideFromSleep(index, !habitsStore.habits.get(index).hideFromSleep)
                        onNameEdited: habitsStore.setName(index, newName)
                        onMoveRequested: habitsStore.move(from, to)
                        onAddRequested: habitsStore.add(name, negative)
                    }

                    App.SideScrollButton {
                        text: "‹"
                        disabled: landscape.loading || landscape.scrollX <= 0
                        contentHeight: landscape.viewportHeight
                        onClicked: landscape.scrollX = Scroll.scrollByBoxes(landscape.scrollX, -7, landscape.step, landscape.maxScrollX)
                    }

                    // Async + gated + hidden-until-Ready: builds the ~600-item
                    // subtree off the main thread against a populated model, and
                    // never exposes partial e-ink state. Canvas paint chains off
                    // onLoaded to avoid main-thread contention with the build.
                    Loader {
                        id: gridLoader
                        width: landscape.viewportWidth
                        height: landscape.viewportHeight
                        asynchronous: true
                        active: habitsStore.isLoaded
                        visible: status === Loader.Ready
                        onLoaded: if (settingsStore.suspendImageEnabled && landscape.isCurrentMonth)
                            suspendCanvas.renderAsync()

                        sourceComponent: Component {
                            App.HabitsGrid {
                                width: landscape.viewportWidth
                                viewportHeight: landscape.viewportHeight
                                habits: habitsStore.habits
                                daysInMonth: landscape.daysInMonth
                                highlightDay: landscape.highlightDay
                                lastNonFutureDay: landscape.lastNonFutureDay
                                year: landscape.viewYear
                                month: landscape.viewMonth
                                editing: landscape.editing
                                scrollX: landscape.scrollX
                                scrollY: landscape.scrollY
                                onEntryToggled: habitsStore.toggleEntry(index, dateKey)
                            }
                        }
                    }

                    // Occupies the grid's exact footprint while the async Loader
                    // builds, so the invisible Loader doesn't collapse the Row and
                    // jam the ‹ / › buttons together.
                    App.AppButton {
                        width: landscape.viewportWidth
                        height: landscape.viewportHeight
                        visible: !landscape.gridReady
                        text: "Loading…"
                        fontSize: App.Theme.titleFont
                        disabled: true
                    }

                    App.SideScrollButton {
                        text: "›"
                        disabled: landscape.loading || landscape.scrollX >= landscape.maxScrollX
                        contentHeight: landscape.viewportHeight
                        onClicked: landscape.scrollX = Scroll.scrollByBoxes(landscape.scrollX, 7, landscape.step, landscape.maxScrollX)
                    }

                    // Vertical ↑ / ↓ buttons scroll a page of habits; shown only when they overflow the height.
                    App.VerticalScrollButtons {
                        visible: landscape.canScrollY
                        buttonHeight: (landscape.bodyViewportHeight - App.Theme.rowSpacing) / 2
                        upDisabled: landscape.loading || landscape.scrollY <= 0
                        downDisabled: landscape.loading || landscape.scrollY >= landscape.maxScrollY
                        onScrollUp: landscape.scrollY = Scroll.scrollByBoxes(landscape.scrollY, -landscape.scrollRows, landscape.rowStep, landscape.maxScrollY)
                        onScrollDown: landscape.scrollY = Scroll.scrollByBoxes(landscape.scrollY, landscape.scrollRows, landscape.rowStep, landscape.maxScrollY)
                    }
                }
            }

            App.GridBottomBar {
                anchors.fill: parent
                editing: landscape.editing
                loading: landscape.loading
                suspendStatusText: root.suspendStatusText
                syncStatusText: root.syncStatusText
                onEditToggled: landscape.editing = !landscape.editing
                onSettingsRequested: landscape.currentView = "settings"
                onQuitRequested: quit()
            }

            App.ConfirmDialog {
                visible: landscape.pendingDeleteIndex >= 0
                message: visible ? "Delete “" + habitsStore.habits.get(landscape.pendingDeleteIndex).name + "”?" : ""
                confirmText: "Delete"
                onConfirmed: {
                    habitsStore.remove(landscape.pendingDeleteIndex);
                    landscape.pendingDeleteIndex = -1;
                }
                onCancelled: landscape.pendingDeleteIndex = -1
            }
        }

        App.SettingsPage {
            anchors.fill: parent
            visible: landscape.currentView === "settings"
            suspendImageEnabled: settingsStore.suspendImageEnabled
            serverUrl: settingsStore.serverUrl
            syncStatusText: root.syncStatusText
            onApplyRequested: root.applySuspendSetting(value)
            onServerUrlApplied: {
                settingsStore.setServerUrl(url);
                syncStore.syncNow();
            }
            onSyncNowRequested: syncStore.syncNow()
            onBackRequested: landscape.currentView = "grid"
        }

        App.ConfirmDialog {
            visible: habitsStore.saveError !== ""
            acknowledgeOnly: true
            confirmText: "Dismiss"
            message: "Couldn’t save to storage — your changes are only in memory. Check that the data/ folder exists on the device.\n\n" + habitsStore.saveError
            onConfirmed: habitsStore.clearSaveError()
            onCancelled: habitsStore.clearSaveError()
        }

        App.ConfirmDialog {
            visible: syncStore.status === "error" && syncStore.errorMessage !== ""
            acknowledgeOnly: true
            confirmText: "Dismiss"
            message: "Sync failed: " + syncStore.errorMessage + ". Check the sync server address in Settings."
            onConfirmed: syncStore.clearError()
            onCancelled: syncStore.clearError()
        }
    }
}
