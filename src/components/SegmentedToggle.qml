import QtQuick 2.15
import ".." as App

Row {
    id: toggle

    property bool value: false
    property int segmentWidth: App.Theme.quitButtonWidth
    property int segmentHeight: App.Theme.quitButtonHeight
    signal toggled(bool value)

    spacing: 0

    AppButton {
        width: toggle.segmentWidth
        height: toggle.segmentHeight
        text: "On"
        active: toggle.value
        onClicked: if (!toggle.value)
            toggle.toggled(true)
    }

    AppButton {
        width: toggle.segmentWidth
        height: toggle.segmentHeight
        text: "Off"
        active: !toggle.value
        onClicked: if (toggle.value)
            toggle.toggled(false)
    }
}
