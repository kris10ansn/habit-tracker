import QtQuick 2.15
import ".." as App
import "../js/Polarity.js" as Polarity

Item {
    id: labels

    property var habits
    property bool showPrivateHabits: false
    property real rowHeight: App.Theme.boxSize
    property real rowGap: App.Theme.rowSpacing
    property real scrollY: 0

    clip: true

    Text {
        text: "Habit"
        color: App.Theme.muted
        font.pixelSize: App.Theme.subtitleFont
        height: App.Theme.dayLabelHeight
        verticalAlignment: Text.AlignVCenter
    }

    Item {
        y: App.Theme.dayLabelHeight
        width: parent.width
        height: parent.height - y
        clip: true

        Column {
            y: -labels.scrollY
            width: parent.width
            spacing: labels.rowGap

            Repeater {
                model: labels.habits

                Item {
                    width: labels.width
                    height: labels.rowHeight
                    visible: labels.showPrivateHabits || !model.isPrivate

                    Text {
                        id: suffix

                        anchors.right: parent.right
                        anchors.verticalCenter: parent.verticalCenter
                        text: (Polarity.isNegative(model.polarity) ? " (−)" : "") + (model.isPrivate ? " P" : "")
                        font.pixelSize: 26
                        color: App.Theme.muted
                    }

                    Text {
                        anchors.left: parent.left
                        anchors.right: suffix.left
                        anchors.rightMargin: 8
                        anchors.verticalCenter: parent.verticalCenter
                        text: model.name
                        elide: Text.ElideRight
                        font.pixelSize: App.Theme.labelFont
                        color: App.Theme.fg
                    }

                }

            }

        }

    }

}
