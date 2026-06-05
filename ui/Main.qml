import QtQuick 2.15

Rectangle {
    id: root
    anchors.fill: parent
    color: "white"

    signal close
    function unloading() {
        console.log("rmhello unloading");
    }

    Component.onCompleted: console.log("rmhello loaded; size:", width, "x", height)

    Text {
        anchors.centerIn: parent
        text: "Hello world (pure QML)"
        font.pixelSize: 96
        color: "black"
    }

    Rectangle {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: 120
        width: 400
        height: 200
        color: "black"
        border.color: "black"
        border.width: 3

        Text {
            anchors.centerIn: parent
            text: "Quit"
            font.pixelSize: 56
            color: "black"
        }

        MouseArea {
            anchors.fill: parent
            onClicked: root.close()
        }
    }
}
