import QtQuick 2.15

Rectangle {
    id: btn

    property string text: ""

    signal clicked

    color: "white"
    border.color: "black"
    border.width: 3

    Text {
        anchors.centerIn: parent
        text: btn.text
        font.pixelSize: 28
        color: "black"
    }

    MouseArea {
        anchors.fill: parent
        onClicked: btn.clicked()
    }
}
