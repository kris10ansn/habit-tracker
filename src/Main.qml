import QtQuick 2.15
import "." as App
import "components" as App
import "js/DateUtils.js" as DateUtils
import "js/Scroll.js" as Scroll

Rectangle {
    id: root
    anchors.fill: parent
    color: App.Theme.bg

    signal close
    function unloading() {
        console.log("Habit Tracker unloading");
        habitsStore.flushPendingSave();
        suspendCanvas.renderSync();
    }

    Component.onCompleted: console.log("Habit Tracker loaded; size:", width, "x", height)

    App.HabitsStore {
        id: habitsStore
    }

    App.SuspendCanvas {
        id: suspendCanvas
        habits: habitsStore.habits
    }

    Connections {
        target: habitsStore
        function onLoaded() {
            suspendCanvas.renderAsync();
        }
        function onSaved() {
            if (!landscape.editing)
                suspendCanvas.scheduleRender();
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

        onEditingChanged: if (!editing)
            suspendCanvas.renderAsync()

        property int step: App.Theme.boxSize + App.Theme.boxSpacing
        property int habitsRowWidth: App.Theme.habitsWidth + (editing ? App.Theme.editingExtraWidth : 0)
        property int viewportWidth: width - 2 * App.Theme.margin - habitsRowWidth - App.Theme.labelGap - 2 * App.Theme.buttonWidth - 2 * App.Theme.buttonGap - (canScrollY ? App.Theme.buttonWidth + App.Theme.buttonGap : 0)
        property int contentWidth: daysInMonth * App.Theme.boxSize + (daysInMonth - 1) * App.Theme.boxSpacing
        property int maxScrollX: Math.max(0, contentWidth - viewportWidth)
        property int scrollX: 0

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
                    fadeOpacity: landscape.scrollX > 0 ? 1.0 : App.Theme.fadedOpacity
                    contentHeight: landscape.viewportHeight
                    onClicked: landscape.scrollX = Scroll.scrollByBoxes(landscape.scrollX, -7, landscape.step, landscape.maxScrollX)
                }

                Loader {
                    id: gridLoader
                    width: landscape.viewportWidth
                    height: landscape.viewportHeight
                    asynchronous: true

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

                App.SideScrollButton {
                    text: "›"
                    fadeOpacity: landscape.scrollX < landscape.maxScrollX ? 1.0 : App.Theme.fadedOpacity
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
                        fadeOpacity: landscape.scrollY > 0 ? 1.0 : App.Theme.fadedOpacity
                        onClicked: landscape.scrollY = Scroll.scrollByBoxes(landscape.scrollY, -landscape.scrollRows, landscape.rowStep, landscape.maxScrollY)
                    }

                    App.AppButton {
                        width: App.Theme.buttonWidth
                        height: (landscape.bodyViewportHeight - App.Theme.rowSpacing) / 2
                        text: "↓"
                        fontSize: App.Theme.scrollFont
                        fadeOpacity: landscape.scrollY < landscape.maxScrollY ? 1.0 : App.Theme.fadedOpacity
                        onClicked: landscape.scrollY = Scroll.scrollByBoxes(landscape.scrollY, landscape.scrollRows, landscape.rowStep, landscape.maxScrollY)
                    }
                }
            }
        }

        App.AppButton {
            anchors.right: parent.right
            anchors.bottom: parent.bottom
            anchors.margins: App.Theme.margin
            width: App.Theme.quitButtonWidth
            height: App.Theme.quitButtonHeight
            text: "Quit"
            onClicked: root.close()
        }

        App.AppButton {
            id: editButton
            anchors.left: parent.left
            anchors.bottom: parent.bottom
            anchors.margins: App.Theme.margin
            width: App.Theme.quitButtonWidth
            height: App.Theme.quitButtonHeight
            text: landscape.editing ? "Done" : "Edit"
            onClicked: landscape.editing = !landscape.editing
        }

        Text {
            anchors.left: editButton.right
            anchors.leftMargin: App.Theme.buttonGap
            anchors.verticalCenter: editButton.verticalCenter
            text: suspendCanvas.statusText
            visible: text.length > 0
            font.pixelSize: App.Theme.subtitleFont
            color: App.Theme.fg
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
}
