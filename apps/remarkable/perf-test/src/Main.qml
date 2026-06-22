import QtQuick 2.15
import "." as P

Rectangle {
    id: root
    anchors.fill: parent
    color: "white"

    signal close
    function unloading() {}

    property string mode: ""

    Column {
        anchors.centerIn: parent
        spacing: 32
        visible: root.mode === ""

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "Perf test"
            font.pixelSize: 48
            font.bold: true
            color: "black"
        }

        P.Btn {
            anchors.horizontalCenter: parent.horizontalCenter
            width: 320
            height: 80
            text: "Single box"
            onClicked: root.mode = "single"
        }

        P.Btn {
            anchors.horizontalCenter: parent.horizontalCenter
            width: 320
            height: 80
            text: "Grid"
            onClicked: root.mode = "grid"
        }

        P.Btn {
            anchors.horizontalCenter: parent.horizontalCenter
            width: 320
            height: 80
            text: "Quit"
            onClicked: root.close()
        }
    }

    Loader {
        id: sceneLoader
        anchors.fill: parent
        active: root.mode !== ""
        source: root.mode === "single" ? "SingleBoxScene.qml"
              : root.mode === "grid" ? "GridScene.qml"
              : ""
    }

    Connections {
        target: sceneLoader.item
        ignoreUnknownSignals: true
        function onBack() { root.mode = "" }
    }
}
