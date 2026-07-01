import QtQuick 2.15
import ".." as App
import "../js/DateUtils.js" as DateUtils

Row {
    id: gridRow

    property int daysInMonth: 0
    property int highlightDay: 0
    property int lastNonFutureDay: 0
    property int year: 0
    property int month: 0
    property bool negative: false
    property var entries: ({})
    property real boxSize: App.Theme.boxSize
    property real boxSpacing: App.Theme.boxSpacing

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
            readonly property var cell: (gridRow.entries || {})[DateUtils.dateKey(gridRow.year, gridRow.month, day)]
            readonly property string entry: cell && cell.state ? cell.state : ""
            readonly property bool isMarkedPositive: entry === "x"
            readonly property bool isMarkedNegative: entry === "o"
            readonly property bool shouldShowDefaultX: gridRow.negative && !isFuture
            readonly property string mark: isMarkedPositive ? "X"
                                         : isMarkedNegative ? "O"
                                         : shouldShowDefaultX ? "X"
                                         : ""
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
