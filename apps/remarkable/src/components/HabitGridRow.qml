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
    // this row's cells, which is why the slice lives on the habit's ListModel row (see Entries.js).
    property var entriesByDate: ({})

    property real boxSize: App.Theme.boxSize
    property real boxSpacing: App.Theme.boxSpacing

    readonly property bool isNegative: Polarity.isNegative(gridRow.polarity)

    signal dayClicked(int day)

    spacing: gridRow.boxSpacing

    Repeater {
        model: gridRow.daysInMonth

        Rectangle {
            id: box
            width: gridRow.boxSize
            height: gridRow.boxSize
            color: App.Theme.bg
            border.color: App.Theme.fg
            border.width: App.Theme.borderWidth

            readonly property int day: index + 1
            readonly property bool isFuture: day > gridRow.lastNonFutureDay
            readonly property var row: (gridRow.entriesByDate || {})[DateUtils.dateKey(gridRow.year, gridRow.month, day)]
            readonly property string outcome: Entries.outcomeOf(row)
            readonly property bool showsImplicitX: gridRow.isNegative && !isFuture
            readonly property string mark: Entries.markFor(outcome, showsImplicitX)
            readonly property bool faded: mark === "O" || isFuture

            Rectangle {
                anchors.fill: parent
                anchors.leftMargin: -gridRow.boxSpacing / 2
                anchors.rightMargin: -gridRow.boxSpacing / 2
                anchors.topMargin: -App.Theme.rowSpacing / 2
                anchors.bottomMargin: -App.Theme.rowSpacing / 2
                color: box.day === gridRow.highlightDay ? App.Theme.fg : "transparent"
                z: -1
            }

            Text {
                anchors.centerIn: parent
                text: box.mark
                font.pixelSize: gridRow.boxSize * 0.7
                font.bold: true
                color: App.Theme.fg
                opacity: box.faded ? App.Theme.fadedOpacity : 1.0
            }

            MouseArea {
                anchors.fill: parent
                onClicked: gridRow.dayClicked(box.day)
            }
        }
    }
}
