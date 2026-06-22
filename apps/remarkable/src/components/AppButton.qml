import QtQuick 2.15
import ".." as App

Rectangle {
    id: button

    property string text: ""
    property int fontSize: App.Theme.buttonFont
    property bool disabled: false
    property bool active: false
    signal clicked

    color: active ? App.Theme.fg : App.Theme.bg
    border.color: App.Theme.fg
    border.width: App.Theme.buttonBorderWidth
    opacity: disabled ? App.Theme.fadedOpacity : 1.0

    Text {
        anchors.centerIn: parent
        text: button.text
        font.pixelSize: button.fontSize
        color: button.active ? App.Theme.bg : App.Theme.fg
    }

    MouseArea {
        anchors.fill: parent
        enabled: !button.disabled
        onClicked: button.clicked()
    }
}
