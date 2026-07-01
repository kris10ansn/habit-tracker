import QtQuick 2.15
import ".." as App

Row {
    id: labels

    property int daysInMonth: 0
    property int highlightDay: 0
    property real boxSize: App.Theme.boxSize
    property real boxSpacing: App.Theme.boxSpacing

    spacing: labels.boxSpacing

    Repeater {
        model: labels.daysInMonth

        Text {
            width: labels.boxSize
            height: App.Theme.dayLabelHeight
            text: index + 1
            font.pixelSize: App.Theme.dayLabelFont
            font.bold: index + 1 === labels.highlightDay
            color: App.Theme.fg
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }
}
