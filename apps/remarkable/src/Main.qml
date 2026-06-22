import QtQuick 2.15
import "." as App
import "components" as App
import "js/DateUtils.js" as DateUtils
import "js/Scroll.js" as Scroll
import "js/SuspendStatus.js" as SuspendStatus

Rectangle {
    id: root
    anchors.fill: parent
    color: App.Theme.bg

    readonly property string suspendStatusText: SuspendStatus.text(suspendCanvas.phase, suspendCanvas.remainingSeconds)

    signal close
    function unloading() {
        console.log("Habit Tracker unloading");
        habitsStore.flushPendingSave();
        settingsStore.flushPendingSave();
        if (settingsStore.suspendImageEnabled)
            suspendCanvas.renderSync();
    }

    // Enabling backs up the stock suspend image before the first overwrite; a
    // failed backup aborts so we never clobber an unrecoverable original.
    // Disabling restores it and invalidates the signature so a later enable
    // re-renders. Commit only — staged in Settings until Done.
    function applySuspendSetting(value) {
        if (value === settingsStore.suspendImageEnabled)
            return;

        if (value) {
            if (!suspendCanvas.backup())
                return;
            settingsStore.setSuspendImageEnabled(true);
            return;
        }

        settingsStore.setSuspendImageEnabled(false);
        suspendCanvas.invalidateSignature();
        suspendCanvas.restore();
    }

    Component.onCompleted: console.log("Habit Tracker loaded; size:", width, "x", height)

    App.HabitsStore {
        id: habitsStore
    }

    App.SettingsStore {
        id: settingsStore
    }

    App.SuspendCanvas {
        id: suspendCanvas
        habits: habitsStore.habits
    }

    Connections {
        target: habitsStore
        function onSaved() {
            if (!landscape.editing && settingsStore.suspendImageEnabled)
                suspendCanvas.scheduleRender();
        }
    }

    // Render once the feature becomes enabled — covers both the Settings commit
    // and settings.json loading after the grid is already built.
    Connections {
        target: settingsStore
        function onSuspendImageEnabledChanged() {
            if (settingsStore.suspendImageEnabled && landscape.gridReady && !landscape.editing)
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
        property int daysInMonth: DateUtils.daysInMonth(today)
        property int currentDay: today.getDate()
        property int currentYear: today.getFullYear()
        property int currentMonth: today.getMonth()
        property bool editing: false
        property int pendingDeleteIndex: -1
        property string currentView: "grid"

        onEditingChanged: if (!editing && settingsStore.suspendImageEnabled)
            suspendCanvas.renderAsync()

        property int step: App.Theme.boxSize + App.Theme.boxSpacing
        property int habitsRowWidth: App.Theme.habitsWidth + (editing ? App.Theme.editingExtraWidth : 0)
        property int viewportWidth: width - 2 * App.Theme.margin - habitsRowWidth - App.Theme.labelGap - 2 * App.Theme.buttonWidth - 2 * App.Theme.buttonGap - (canScrollY ? App.Theme.buttonWidth + App.Theme.buttonGap : 0)
        property int contentWidth: daysInMonth * App.Theme.boxSize + (daysInMonth - 1) * App.Theme.boxSpacing
        property int maxScrollX: Math.max(0, contentWidth - viewportWidth)
        property int scrollX: 0

        readonly property bool gridReady: gridLoader.status === Loader.Ready
        readonly property bool loading: !gridReady

        onViewportWidthChanged: scrollX = Scroll.centerOnDay(currentDay, viewportWidth, App.Theme.boxSize, App.Theme.boxSpacing, maxScrollX)

        // Vertical scrolling for when the habit rows overflow the available height.
        property int viewportHeight: height - 2 * App.Theme.margin - monthHeader.height - App.Theme.quitButtonHeight - 2 * App.Theme.rowSpacing
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

                App.MonthHeader {
                    id: monthHeader
                    date: landscape.today
                    warn: suspendCanvas.lastRenderFailed
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
                        onLoaded: if (settingsStore.suspendImageEnabled)
                            suspendCanvas.renderAsync()

                        sourceComponent: Component {
                            App.HabitsGrid {
                                width: landscape.viewportWidth
                                viewportHeight: landscape.viewportHeight
                                habits: habitsStore.habits
                                daysInMonth: landscape.daysInMonth
                                currentDay: landscape.currentDay
                                year: landscape.currentYear
                                month: landscape.currentMonth
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
                    Column {
                        spacing: App.Theme.rowSpacing
                        visible: landscape.canScrollY

                        Item {
                            width: App.Theme.buttonWidth
                            height: App.Theme.dayLabelHeight
                        }

                        App.AppButton {
                            width: App.Theme.buttonWidth
                            height: (landscape.bodyViewportHeight - App.Theme.rowSpacing) / 2
                            text: "↑"
                            fontSize: App.Theme.scrollFont
                            disabled: landscape.loading || landscape.scrollY <= 0
                            onClicked: landscape.scrollY = Scroll.scrollByBoxes(landscape.scrollY, -landscape.scrollRows, landscape.rowStep, landscape.maxScrollY)
                        }

                        App.AppButton {
                            width: App.Theme.buttonWidth
                            height: (landscape.bodyViewportHeight - App.Theme.rowSpacing) / 2
                            text: "↓"
                            fontSize: App.Theme.scrollFont
                            disabled: landscape.loading || landscape.scrollY >= landscape.maxScrollY
                            onClicked: landscape.scrollY = Scroll.scrollByBoxes(landscape.scrollY, landscape.scrollRows, landscape.rowStep, landscape.maxScrollY)
                        }
                    }
                }
            }

            App.AppButton {
                id: quitButton
                anchors.right: parent.right
                anchors.bottom: parent.bottom
                anchors.margins: App.Theme.margin
                width: App.Theme.quitButtonWidth
                height: App.Theme.quitButtonHeight
                text: "Quit"
                onClicked: root.close()
            }

            App.AppButton {
                id: settingsButton
                anchors.right: quitButton.left
                anchors.rightMargin: App.Theme.buttonGap
                anchors.bottom: parent.bottom
                anchors.bottomMargin: App.Theme.margin
                width: App.Theme.quitButtonWidth
                height: App.Theme.quitButtonHeight
                text: "Settings"
                disabled: landscape.loading
                onClicked: landscape.currentView = "settings"
            }

            App.AppButton {
                id: editButton
                anchors.left: parent.left
                anchors.bottom: parent.bottom
                anchors.margins: App.Theme.margin
                width: App.Theme.quitButtonWidth
                height: App.Theme.quitButtonHeight
                text: landscape.editing ? "Done" : "Edit"
                disabled: landscape.loading
                onClicked: landscape.editing = !landscape.editing
            }

            App.StatusText {
                anchors.left: editButton.right
                anchors.leftMargin: App.Theme.buttonGap
                anchors.verticalCenter: editButton.verticalCenter
                text: root.suspendStatusText
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
            onApplyRequested: root.applySuspendSetting(value)
            onBackRequested: landscape.currentView = "grid"
        }
    }
}
