import QtQuick 2.15
import ".." as App
import "../components"

Item {
    id: page

    property bool busy: false
    property bool canRender: false
    property string statusText: ""
    property string dataDirectory: ""
    property string previewPath: ""
    property string backupPath: ""
    property string backupDirectory: ""

    signal previewRequested
    signal writeRequested
    signal restoreRequested
    signal writeAllRequested
    signal restoreAllRequested
    signal backRequested

    Column {
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.margins: App.Theme.margin
        spacing: App.Theme.rowSpacing

        Text {
            text: "Developer options · TEST"
            font.pixelSize: App.Theme.titleFont
            font.bold: true
            color: App.Theme.fg
        }

        Text {
            width: parent.width
            text: "Write once and Restore change the device’s system screens. Automatic test renders stay local. Private habits stay excluded."
            wrapMode: Text.WordWrap
            font.pixelSize: App.Theme.labelFont
            color: App.Theme.fg
        }

        Row {
            spacing: App.Theme.buttonGap

            AppButton {
                height: App.Theme.quitButtonHeight
                width: 440
                text: "Write all screens once"
                disabled: page.busy || !page.canRender
                onClicked: page.writeAllRequested()
            }

            AppButton {
                height: App.Theme.quitButtonHeight
                width: 460
                text: "Restore all original screens"
                disabled: page.busy
                onClicked: page.restoreAllRequested()
            }
        }

        Text {
            width: parent.width
            text: "All available screens: sleeping, powered off, battery empty, starting, restarting, overheating, crash recovery, and reMarkable 1 early boot."
            wrapMode: Text.WordWrap
            font.pixelSize: App.Theme.subtitleFont
            color: App.Theme.fg
        }

        Row {
            spacing: App.Theme.buttonGap

            AppButton {
                height: App.Theme.quitButtonHeight
                width: 280
                text: "Render preview"
                disabled: page.busy || !page.canRender
                onClicked: page.previewRequested()
            }

            AppButton {
                height: App.Theme.quitButtonHeight
                width: 440
                text: "Write suspend image once"
                disabled: page.busy || !page.canRender
                onClicked: page.writeRequested()
            }

            AppButton {
                height: App.Theme.quitButtonHeight
                width: 380
                text: "Restore original image"
                disabled: page.busy
                onClicked: page.restoreRequested()
            }
        }

        Text {
            visible: !page.canRender
            text: "Return to the current month and finish loading readable habit data to render."
            font.pixelSize: App.Theme.labelFont
            color: App.Theme.fg
        }

        Text {
            width: parent.width
            text: page.statusText
            wrapMode: Text.WordWrap
            font.pixelSize: App.Theme.labelFont
            color: App.Theme.fg
        }

        Text {
            width: parent.width
            text: "Data: " + page.dataDirectory + "\n\nPreview: " + page.previewPath + "\n\nSuspend backup: " + page.backupPath + "\n\nScreen backups: " + page.backupDirectory
            wrapMode: Text.WrapAnywhere
            font.pixelSize: App.Theme.subtitleFont
            color: App.Theme.fg
        }

        Text {
            width: parent.width
            text: "Each screen’s first write keeps its original backup, including both boot BMP copies. Wait for completion before powering off. Restore all originals before removing the test install. Close the stable app while testing so it cannot overwrite your test images."
            wrapMode: Text.WordWrap
            font.pixelSize: App.Theme.labelFont
            color: App.Theme.fg
        }
    }

    AppButton {
        anchors.left: parent.left
        anchors.bottom: parent.bottom
        anchors.margins: App.Theme.margin
        height: App.Theme.quitButtonHeight
        width: App.Theme.quitButtonWidth
        text: "Back"
        disabled: page.busy
        onClicked: page.backRequested()
    }
}
