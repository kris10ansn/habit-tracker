import QtQuick 2.15
import ".." as App
import "../js/DateUtils.js" as DateUtils

Item {
    id: grid

    property var habits
    property int daysInMonth: 0
    property int highlightDay: 0
    property int lastNonFutureDay: 0
    property int year: 0
    property int month: 0
    property bool showPrivateHabits: false
    property real scrollX: 0
    property real scrollY: 0
    property real rowHeight: App.Theme.boxSize
    property real rowGap: App.Theme.rowSpacing

    signal entryToggled(int index, string dateKey)

    clip: true

    DayLabelsRow {
        x: -grid.scrollX
        daysInMonth: grid.daysInMonth
        highlightDay: grid.highlightDay
    }

    Item {
        y: App.Theme.dayLabelHeight
        width: grid.width
        height: grid.height - y
        clip: true

        Column {
            x: -grid.scrollX
            y: -grid.scrollY
            spacing: grid.rowGap

            Repeater {
                model: grid.habits

                HabitGridRow {
                    visible: grid.showPrivateHabits || !model.isPrivate
                    daysInMonth: grid.daysInMonth
                    highlightDay: grid.highlightDay
                    lastNonFutureDay: grid.lastNonFutureDay
                    year: grid.year
                    month: grid.month
                    polarity: model.polarity
                    entriesByDate: model.entriesByDate || ({
                    })
                    rowHeight: grid.rowHeight
                    onDayClicked: grid.entryToggled(index, DateUtils.dateKey(grid.year, grid.month, day))
                }

            }

        }

    }

}
