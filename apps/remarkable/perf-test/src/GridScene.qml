import QtQuick 2.15
import "." as P

Item {
    id: scene
    anchors.fill: parent

    signal back

    readonly property int daysInMonth: 30
    readonly property int currentDay: 15
    readonly property int habitCount: 8

    readonly property int boxSize: 80
    readonly property int boxSpacing: 12
    readonly property int rowSpacing: 24
    readonly property int margin: 40
    readonly property int habitsWidth: 360
    readonly property int buttonGap: 20
    readonly property int dayLabelHeight: 32

    Item {
        id: landscape
        anchors.centerIn: parent
        width: parent.height
        height: parent.width
        rotation: 90

        Column {
            anchors.fill: parent
            anchors.margins: scene.margin
            spacing: scene.rowSpacing

            Column {
                spacing: 4

                Text {
                    text: "Grid scene"
                    font.pixelSize: 48
                    font.bold: true
                    color: "black"
                }

                Text {
                    text: scene.daysInMonth + " days"
                    font.pixelSize: 24
                    color: "black"
                }
            }

            Row {
                spacing: scene.buttonGap

                Column {
                    width: scene.habitsWidth
                    spacing: scene.rowSpacing

                    Item {
                        width: 1
                        height: scene.dayLabelHeight
                    }

                    Repeater {
                        model: scene.habitCount

                        Text {
                            width: scene.habitsWidth
                            height: scene.boxSize
                            text: "Habit " + (index + 1)
                            font.pixelSize: 28
                            color: "black"
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }

                Column {
                    spacing: scene.rowSpacing

                    Row {
                        spacing: scene.boxSpacing

                        Repeater {
                            model: scene.daysInMonth

                            Text {
                                width: scene.boxSize
                                height: scene.dayLabelHeight
                                text: index + 1
                                font.pixelSize: 22
                                font.bold: index + 1 === scene.currentDay
                                color: "black"
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                        }
                    }

                    Repeater {
                        model: scene.habitCount

                        Row {
                            spacing: scene.boxSpacing

                            Repeater {
                                model: scene.daysInMonth

                                Rectangle {
                                    id: cell
                                    property string entry: ""
                                    readonly property string mark: entry === "x" ? "X" : entry === "o" ? "O" : ""
                                    readonly property bool faded: entry === "o"

                                    width: scene.boxSize
                                    height: scene.boxSize
                                    color: "white"
                                    border.color: "black"
                                    border.width: 2

                                    Text {
                                        anchors.centerIn: parent
                                        text: cell.mark
                                        font.pixelSize: scene.boxSize * 0.7
                                        font.bold: true
                                        color: "black"
                                        opacity: cell.faded ? 0.3 : 1.0
                                    }

                                    MouseArea {
                                        anchors.fill: parent
                                        onClicked: cell.entry = cell.entry === "" ? "x" : cell.entry === "x" ? "o" : ""
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        P.Btn {
            anchors.left: parent.left
            anchors.bottom: parent.bottom
            anchors.margins: scene.margin
            width: 160
            height: 60
            text: "Back"
            onClicked: scene.back()
        }
    }
}
