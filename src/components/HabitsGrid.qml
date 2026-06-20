import QtQuick 2.15
import ".." as App
import "../js/DateUtils.js" as DateUtils

Item {
    id: grid

    property var habits: []
    property int daysInMonth: 0
    property int currentDay: 0
    property int year: 0
    property int month: 0
    property bool editing: false
    property int scrollX: 0
    property int scrollY: 0
    property real boxSize: App.Theme.boxSize
    property real boxSpacing: App.Theme.boxSpacing
    property real viewportHeight: 0

    property alias bodyContentHeight: body.height

    signal entryToggled(int index, string dateKey)

    height: viewportHeight
    clip: true

    DayLabelsRow {
        id: dayLabels
        x: -grid.scrollX
        daysInMonth: grid.daysInMonth
        currentDay: grid.currentDay
        boxSize: grid.boxSize
        boxSpacing: grid.boxSpacing
    }

    Item {
        id: bodyViewport
        // Start half a row-gap above the first box so the today-column highlight,
        // which bleeds rowSpacing/2 past the box, isn't clipped at the top.
        y: dayLabels.height + App.Theme.rowSpacing / 2
        width: grid.width
        height: grid.height - y
        clip: true

        Column {
            id: body
            x: -grid.scrollX
            y: App.Theme.rowSpacing / 2 - grid.scrollY
            spacing: App.Theme.rowSpacing

            Repeater {
                model: grid.habits

                HabitGridRow {
                    daysInMonth: grid.daysInMonth
                    currentDay: grid.currentDay
                    year: grid.year
                    month: grid.month
                    negative: model.negative
                    entries: model.entries || ({})
                    boxSize: grid.boxSize
                    boxSpacing: grid.boxSpacing
                    onDayClicked: grid.entryToggled(index, DateUtils.dateKey(grid.year, grid.month, day))
                }
            }

            Item {
                visible: grid.editing
                width: 1
                height: grid.boxSize
            }
        }
    }

    Repeater {
        model: Math.floor((grid.daysInMonth - 1) / 7)

        Rectangle {
            width: App.Theme.borderWidth
            height: grid.height
            x: -grid.scrollX + (index + 1) * 7 * (grid.boxSize + grid.boxSpacing) - grid.boxSpacing / 2 - width / 2
            color: App.Theme.fg
        }
    }
}
