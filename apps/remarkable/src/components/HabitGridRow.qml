import QtQuick 2.15
import ".." as App
import "../js/DateUtils.js" as DateUtils
import "../js/Entries.js" as Entries
import "../js/Polarity.js" as Polarity

Row {
    id: gridRow

    property int daysInMonth: 0
    property int highlightDay: 0
    property int lastNonFutureDay: 0
    property int year: 0
    property int month: 0
    property string polarity: Polarity.POSITIVE

    // This habit's slice of the viewed month: dateKey -> entry row. Replacing it re-evaluates only
    // this row's cells, which is why the slice is per-habit rather than grid-wide (see Entries.js).
    property var entriesByDate: ({})

    property real boxSize: App.Theme.boxSize
    property real boxSpacing: App.Theme.boxSpacing
    property real rowHeight: App.Theme.boxSize

    readonly property bool isNegative: Polarity.isNegative(gridRow.polarity)

    signal dayClicked(int day)

    spacing: gridRow.boxSpacing

    Repeater {
        model: gridRow.daysInMonth

        Rectangle {
            id: box
            width: gridRow.boxSize
            height: gridRow.rowHeight
            color: box.day === gridRow.highlightDay ? "#e7e7e7" : App.Theme.bg
            radius: 6
            border.color: box.day === gridRow.highlightDay ? "#666666" : "#999999"
            border.width: App.Theme.borderWidth

            readonly property int day: index + 1
            readonly property bool isFuture: day > gridRow.lastNonFutureDay
            readonly property var entryRow: (gridRow.entriesByDate || {})[DateUtils.dateKey(gridRow.year, gridRow.month, day)]
            readonly property string outcome: Entries.outcomeOf(entryRow)
            readonly property bool showsImplicitX: gridRow.isNegative && !isFuture
            readonly property string mark: Entries.markFor(outcome, showsImplicitX)
            readonly property bool faded: mark === "O" || isFuture

            Text {
                anchors.centerIn: parent
                text: box.mark
                font.pixelSize: 48
                color: box.faded ? App.Theme.muted : App.Theme.fg
            }

            MouseArea {
                anchors.fill: parent
                onClicked: gridRow.dayClicked(box.day)
            }
        }
    }
}
