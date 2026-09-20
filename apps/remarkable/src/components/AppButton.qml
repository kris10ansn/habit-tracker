import QtQuick 2.15
import ".." as App

Rectangle {
    id: button

    property string text: ""
    property int fontSize: App.Theme.buttonFont
    property bool disabled: false
    property bool active: false
    property bool quiet: false
    signal clicked

    color: active ? App.Theme.fg : App.Theme.bg
    border.color: active ? App.Theme.fg : "#888888"
    border.width: quiet ? 0 : App.Theme.buttonBorderWidth
    radius: 8
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
