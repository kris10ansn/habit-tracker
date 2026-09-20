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

    signal previewRequested
    signal writeRequested
    signal restoreRequested
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
            text: "Test habits and settings are separate. Only Write once and Restore below change the device’s suspend image. Private habits stay excluded."
            wrapMode: Text.WordWrap
            font.pixelSize: App.Theme.labelFont
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
            text: "Data: " + page.dataDirectory + "\n\nPreview: " + page.previewPath + "\n\nOriginal image backup: " + page.backupPath
            wrapMode: Text.WrapAnywhere
            font.pixelSize: App.Theme.subtitleFont
            color: App.Theme.fg
        }

        Text {
            width: parent.width
            text: "The first write keeps the current device image as your original backup, including after restarting the app. Restore it before removing the test install. Close the stable app while testing the suspend image so it cannot overwrite your test image."
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
