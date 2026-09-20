import QtQuick 2.15
import ".." as App
import "../js/HabitLayout.js" as HabitLayout
import "../js/Scroll.js" as Scroll

Item {
    id: page

    property var habits
    property bool showPrivateHabits: false
    property date date: new Date()
    property bool isCurrentMonth: true
    property int daysInMonth: 0
    property int highlightDay: 0
    property int lastNonFutureDay: 0
    property int year: 0
    property int month: 0
    property bool disabled: false
    property string suspendStatusText: ""
    property string syncStatusText: ""
    property string buildLabel: ""
    property real scrollX: 0
    property real scrollY: 0
    readonly property int visibleCount: HabitLayout.visibleCount(habits, showPrivateHabits)
    readonly property real bodyHeight: Math.max(1, gridArea.height - App.Theme.dayLabelHeight)
    readonly property real rowHeight: HabitLayout.rowHeight(visibleCount, bodyHeight, App.Theme.minimumRowHeight, App.Theme.maximumRowHeight, App.Theme.rowSpacing)
    readonly property real maxScrollY: Math.max(0, HabitLayout.contentHeight(visibleCount, rowHeight, App.Theme.rowSpacing) - bodyHeight)
    readonly property real step: App.Theme.boxSize + App.Theme.boxSpacing
    readonly property real maxScrollX: Math.max(0, daysInMonth * step - App.Theme.boxSpacing - grid.width)
    readonly property int scrollRows: HabitLayout.pageRows(bodyHeight, rowHeight, App.Theme.rowSpacing)

    signal previousRequested()
    signal nextRequested()
    signal currentRequested()
    signal editRequested()
    signal settingsRequested()
    signal quitRequested()
    signal entryToggled(int index, string dateKey)

    function recenter() {
        const centered = isCurrentMonth ? Scroll.centerOnDay(highlightDay, grid.width, App.Theme.boxSize, App.Theme.boxSpacing, maxScrollX) : 0;
        scrollX = Math.max(0, Math.min(maxScrollX, Math.round(centered / step) * step));
    }

    onMaxScrollYChanged: scrollY = Math.max(0, Math.min(scrollY, maxScrollY))
    onMaxScrollXChanged: Qt.callLater(page.recenter)
    onDateChanged: Qt.callLater(page.recenter)
    Component.onCompleted: Qt.callLater(page.recenter)

    MonthNavHeader {
        anchors.left: parent.left
        anchors.top: parent.top
        anchors.margins: App.Theme.margin
        date: page.date
        isCurrentMonth: page.isCurrentMonth
        disabled: page.disabled
        onPreviousRequested: page.previousRequested()
        onNextRequested: page.nextRequested()
        onCurrentRequested: page.currentRequested()
    }

    Row {
        anchors.top: parent.top
        anchors.right: parent.right
        anchors.margins: App.Theme.margin
        spacing: 16

        AppButton {
            width: 208
            height: App.Theme.quitButtonHeight
            text: "Edit habits"
            disabled: page.disabled
            onClicked: page.editRequested()
        }

        AppButton {
            width: 172
            height: App.Theme.quitButtonHeight
            text: "Settings"
            disabled: page.disabled
            onClicked: page.settingsRequested()
        }

        AppButton {
            width: 120
            height: App.Theme.quitButtonHeight
            text: "Quit"
            quiet: true
            onClicked: page.quitRequested()
        }

    }

    Rectangle {
        x: App.Theme.margin
        y: 162
        width: parent.width - 2 * x
        height: 2
        color: App.Theme.fg
    }

    Text {
        x: App.Theme.margin
        y: 194
        text: (page.buildLabel ? page.buildLabel + " · " : "") + (page.isCurrentMonth ? Qt.formatDate(page.date, "dddd, d MMMM") : page.daysInMonth + " days · " + page.year)
        color: App.Theme.muted
        font.pixelSize: App.Theme.subtitleFont
    }

    Text {
        anchors.right: parent.right
        anchors.rightMargin: App.Theme.margin
        y: 194
        text: (Math.floor(page.scrollX / page.step) + 1) + "–" + Math.min(page.daysInMonth, Math.ceil((page.scrollX + grid.width) / page.step)) + " " + Qt.formatDate(page.date, "MMM")
        color: App.Theme.muted
        font.pixelSize: App.Theme.subtitleFont
    }

    Item {
        id: gridArea

        x: App.Theme.margin
        y: 250
        width: parent.width - 2 * x
        height: Math.max(1, parent.height - y - 182)
        visible: page.visibleCount > 0

        HabitsColumn {
            width: App.Theme.habitsWidth
            height: parent.height
            habits: page.habits
            showPrivateHabits: page.showPrivateHabits
            rowHeight: page.rowHeight
            scrollY: page.scrollY
        }

        HabitsGrid {
            id: grid

            x: App.Theme.habitsWidth + App.Theme.labelGap
            width: Math.max(1, parent.width - x - (page.maxScrollY > 0 ? 100 : 0))
            height: parent.height
            habits: page.habits
            showPrivateHabits: page.showPrivateHabits
            rowHeight: page.rowHeight
            scrollX: page.scrollX
            scrollY: page.scrollY
            daysInMonth: page.daysInMonth
            highlightDay: page.highlightDay
            lastNonFutureDay: page.lastNonFutureDay
            year: page.year
            month: page.month
            onEntryToggled: page.entryToggled(index, dateKey)
        }

        VerticalScrollButtons {
            anchors.right: parent.right
            visible: page.maxScrollY > 0
            buttonHeight: (page.bodyHeight - App.Theme.rowSpacing) / 2
            upDisabled: page.scrollY <= 0
            downDisabled: page.scrollY >= page.maxScrollY
            onScrollUp: page.scrollY = Scroll.scrollByBoxes(page.scrollY, -page.scrollRows, page.rowHeight + App.Theme.rowSpacing, page.maxScrollY)
            onScrollDown: page.scrollY = Scroll.scrollByBoxes(page.scrollY, page.scrollRows, page.rowHeight + App.Theme.rowSpacing, page.maxScrollY)
        }

    }

    Column {
        x: App.Theme.margin
        y: 340
        spacing: 32
        visible: page.visibleCount === 0

        Text {
            text: page.habits.count ? "No visible habits" : "Make room for a good habit."
            color: App.Theme.fg
            font.pixelSize: 52
        }

        Text {
            text: page.habits.count ? "Reveal private habits in Settings to see them here." : "Add your first habit to start tracking."
            color: App.Theme.muted
            font.pixelSize: 32
        }

        AppButton {
            width: 240
            height: 72
            text: page.habits.count ? "Open Settings" : "Add a habit"
            onClicked: page.habits.count ? page.settingsRequested() : page.editRequested()
        }

    }

    Row {
        x: App.Theme.margin
        y: parent.height - 154
        spacing: 16

        AppButton {
            width: 76
            height: 64
            text: "‹"
            fontSize: App.Theme.scrollFont
            disabled: page.scrollX <= 0
            onClicked: page.scrollX = Scroll.scrollByBoxes(page.scrollX, -7, page.step, page.maxScrollX)
        }

        Text {
            height: 64
            verticalAlignment: Text.AlignVCenter
            text: "Days"
            font.pixelSize: 28
            color: App.Theme.muted
        }

        AppButton {
            width: 76
            height: 64
            text: "›"
            fontSize: App.Theme.scrollFont
            disabled: page.scrollX >= page.maxScrollX
            onClicked: page.scrollX = Scroll.scrollByBoxes(page.scrollX, 7, page.step, page.maxScrollX)
        }

    }

    Text {
        anchors.right: parent.right
        anchors.rightMargin: App.Theme.margin
        y: parent.height - 142
        text: (page.maxScrollY > 0 ? "Habits " + (Math.floor((page.scrollY + App.Theme.rowSpacing) / (page.rowHeight + App.Theme.rowSpacing)) + 1) + "–" + Math.min(page.visibleCount, Math.ceil((page.scrollY + page.bodyHeight) / (page.rowHeight + App.Theme.rowSpacing))) + " of " + page.visibleCount + "   ·   " : "") + "X done   O missed"
        color: App.Theme.muted
        font.pixelSize: 28
    }

    ScreenStatus {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        leftText: page.syncStatusText
        rightText: page.suspendStatusText
    }

}
