import QtQuick 2.15
import "." as P

Item {
    id: scene
    anchors.fill: parent

    signal back

    property bool marked: false

    Rectangle {
        anchors.centerIn: parent
        width: 80
        height: 80
        color: "white"
        border.color: "black"
        border.width: 2

        Text {
            anchors.centerIn: parent
            text: scene.marked ? "X" : ""
            font.pixelSize: 56
            font.bold: true
            color: "black"
        }

        MouseArea {
            anchors.fill: parent
            onClicked: scene.marked = !scene.marked
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
