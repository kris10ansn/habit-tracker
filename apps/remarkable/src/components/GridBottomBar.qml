import QtQuick 2.15
import ".." as App

// The grid's bottom controls: Edit / Done on the left with the ambient status
// lines beside it, Settings and Quit on the right. Fills the page; the gaps
// between buttons pass clicks through to the grid underneath.
Item {
    id: bottomBar

    property bool editing: false
    property bool loading: false
    property string suspendStatusText: ""
    property string syncStatusText: ""

    signal editToggled
    signal settingsRequested
    signal quitRequested

    AppButton {
        id: quitButton
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        anchors.margins: App.Theme.margin
        width: App.Theme.quitButtonWidth
        height: App.Theme.quitButtonHeight
        text: "Quit"
        onClicked: bottomBar.quitRequested()
    }

    AppButton {
        anchors.right: quitButton.left
        anchors.rightMargin: App.Theme.buttonGap
        anchors.bottom: parent.bottom
        anchors.bottomMargin: App.Theme.margin
        width: App.Theme.quitButtonWidth
        height: App.Theme.quitButtonHeight
        text: "Settings"
        disabled: bottomBar.loading
        onClicked: bottomBar.settingsRequested()
    }

    AppButton {
        id: editButton
        anchors.left: parent.left
        anchors.bottom: parent.bottom
        anchors.margins: App.Theme.margin
        width: App.Theme.quitButtonWidth
        height: App.Theme.quitButtonHeight
        text: bottomBar.editing ? "Done" : "Edit"
        disabled: bottomBar.loading
        onClicked: bottomBar.editToggled()
    }

    Column {
        anchors.left: editButton.right
        anchors.leftMargin: App.Theme.buttonGap
        anchors.verticalCenter: editButton.verticalCenter

        StatusText {
            text: bottomBar.suspendStatusText
        }

        StatusText {
            text: bottomBar.syncStatusText
        }
    }
}
