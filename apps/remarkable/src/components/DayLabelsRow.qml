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

        Rectangle {
            width: labels.boxSize
            height: App.Theme.dayLabelHeight
            color: index + 1 === labels.highlightDay ? App.Theme.fg : App.Theme.bg
            Text {
                anchors.centerIn: parent
                text: index + 1
                font.pixelSize: App.Theme.dayLabelFont
                color: index + 1 === labels.highlightDay ? App.Theme.bg : App.Theme.fg
            }
        }
    }
}
