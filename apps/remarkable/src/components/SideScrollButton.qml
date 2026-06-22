import QtQuick 2.15
import ".." as App

Column {
    id: scrollColumn

    property string text: ""
    property bool disabled: false
    property int contentHeight: 0
    signal clicked

    spacing: App.Theme.rowSpacing

    Item {
        width: App.Theme.buttonWidth
        height: App.Theme.dayLabelHeight
    }

    AppButton {
        width: App.Theme.buttonWidth
        height: scrollColumn.contentHeight - App.Theme.dayLabelHeight - App.Theme.rowSpacing
        text: scrollColumn.text
        fontSize: App.Theme.scrollFont
        disabled: scrollColumn.disabled
        onClicked: scrollColumn.clicked()
    }
}
