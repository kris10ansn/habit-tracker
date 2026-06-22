import QtQuick 2.15
import ".." as App

Item {
    id: settingsPage

    property bool suspendImageEnabled: false
    signal applyRequested(bool value)
    signal backRequested

    property bool staged: false
    readonly property bool dirty: staged !== suspendImageEnabled

    Component.onCompleted: settingsPage.staged = settingsPage.suspendImageEnabled
    onVisibleChanged: if (visible)
        settingsPage.staged = settingsPage.suspendImageEnabled
    // A committed change lands here (suspendImageEnabled follows the store), so
    // re-sync staged — Done becomes idle and dirty clears.
    onSuspendImageEnabledChanged: settingsPage.staged = settingsPage.suspendImageEnabled

    Column {
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.margins: App.Theme.margin
        spacing: App.Theme.rowSpacing

        Text {
            text: "Settings"
            font.pixelSize: App.Theme.titleFont
            font.bold: true
            color: App.Theme.fg
        }

        Row {
            spacing: App.Theme.buttonGap

            Text {
                anchors.verticalCenter: parent.verticalCenter
                text: "Write to suspend image"
                font.pixelSize: App.Theme.labelFont
                color: App.Theme.fg
            }

            SegmentedToggle {
                anchors.verticalCenter: parent.verticalCenter
                value: settingsPage.staged
                onToggled: settingsPage.staged = value
            }
        }
    }

    AppButton {
        id: backButton
        anchors.left: parent.left
        anchors.bottom: parent.bottom
        anchors.margins: App.Theme.margin
        width: App.Theme.quitButtonWidth
        height: App.Theme.quitButtonHeight
        text: "Back"
        onClicked: settingsPage.dirty ? unsavedDialog.visible = true : settingsPage.backRequested()
    }

    AppButton {
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        anchors.margins: App.Theme.margin
        width: App.Theme.quitButtonWidth
        height: App.Theme.quitButtonHeight
        text: "Done"
        disabled: !settingsPage.dirty
        onClicked: {
            settingsPage.applyRequested(settingsPage.staged);
            settingsPage.backRequested();
        }
    }

    ConfirmDialog {
        id: unsavedDialog
        visible: false
        message: "Discard unsaved settings changes?"
        confirmText: "Discard"
        onConfirmed: {
            unsavedDialog.visible = false;
            settingsPage.backRequested();
        }
        onCancelled: unsavedDialog.visible = false
    }
}
