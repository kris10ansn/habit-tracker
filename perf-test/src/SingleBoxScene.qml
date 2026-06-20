import QtQuick 2.15
import "." as P

Item {
    id: scene
    anchors.fill: parent

    signal back

    property string entry: ""
    readonly property string mark: entry === "x" ? "X" : entry === "o" ? "O" : ""
    readonly property bool faded: entry === "o"

    Rectangle {
        anchors.centerIn: parent
        width: 80
        height: 80
        color: "white"
        border.color: "black"
        border.width: 2

        Text {
            anchors.centerIn: parent
            text: scene.mark
            font.pixelSize: 56
            font.bold: true
            color: "black"
            opacity: scene.faded ? 0.3 : 1.0
        }

        MouseArea {
            anchors.fill: parent
            onClicked: scene.entry = scene.entry === "" ? "x" : scene.entry === "x" ? "o" : ""
        }
    }

    P.Btn {
        anchors.left: parent.left
        anchors.bottom: parent.bottom
        anchors.margins: 40
        width: 160
        height: 60
        text: "Back"
        onClicked: scene.back()
    }
}
