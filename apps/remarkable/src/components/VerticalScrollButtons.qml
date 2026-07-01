import QtQuick 2.15
import ".." as App

// ↑ / ↓ buttons that page the habit rows when they overflow the height. The
// leading spacer aligns the buttons with the grid body, past the day labels.
Column {
    id: verticalScroll

    property real buttonHeight: 0
    property bool upDisabled: false
    property bool downDisabled: false

    signal scrollUp
    signal scrollDown

    spacing: App.Theme.rowSpacing

    Item {
        width: App.Theme.buttonWidth
        height: App.Theme.dayLabelHeight
    }

    AppButton {
        width: App.Theme.buttonWidth
        height: verticalScroll.buttonHeight
        text: "↑"
        fontSize: App.Theme.scrollFont
        disabled: verticalScroll.upDisabled
        onClicked: verticalScroll.scrollUp()
    }

    AppButton {
        width: App.Theme.buttonWidth
        height: verticalScroll.buttonHeight
        text: "↓"
        fontSize: App.Theme.scrollFont
        disabled: verticalScroll.downDisabled
        onClicked: verticalScroll.scrollDown()
    }
}
