import QtQuick 2.15
import ".." as App
import "../js/BuildProfile.js" as BuildProfile

Item {
    id: settingsPage

    property bool suspendImageEnabled: false
    property bool suspendImageBusy: false
    property bool showPrivateHabits: false
    property string serverUrl: ""
    property string syncStatusText: ""
    // Tablet pairing (Connect flow). pairingConnected reflects whether SettingsStore is holding a
    // token; pairingStatus is PairingStore's own transient phase: "" (idle) | "requesting" |
    // "waiting" (code on screen, polling) | "expired" | "error".
    property bool pairingConnected: false
    property string pairingStatus: ""
    property string pairingCode: ""
    property string pairingErrorMessage: ""
    property bool staged: false
    property bool stagedShowPrivate: false
    property string stagedUrl: ""
    readonly property bool suspendImageDirty: staged !== suspendImageEnabled
    readonly property bool showPrivateDirty: stagedShowPrivate !== showPrivateHabits
    readonly property bool urlDirty: stagedUrl.trim() !== serverUrl
    readonly property bool dirty: suspendImageDirty || showPrivateDirty || urlDirty
    // A server address that is both set and committed. Both network actions gate on it: a staged
    // edit is not a server yet, so acting on the old address would talk to the wrong host.
    readonly property bool serverUrlReady: serverUrl.trim() !== "" && !urlDirty
    readonly property bool pairingRequestInFlight: pairingStatus === "requesting" || pairingStatus === "waiting"

    signal applyRequested(bool value)
    signal showPrivateHabitsApplied(bool value)
    signal serverUrlApplied(string url)
    signal syncNowRequested()
    signal connectRequested()
    signal disconnectRequested()
    signal developerRequested()
    signal backRequested()

    function _resync() {
        settingsPage.staged = settingsPage.suspendImageEnabled;
        settingsPage.stagedShowPrivate = settingsPage.showPrivateHabits;
        settingsPage.stagedUrl = settingsPage.serverUrl;
    }

    function _pairingHintText() {
        if (settingsPage.pairingStatus === "requesting")
            return "Requesting a code…";

        if (settingsPage.pairingStatus === "expired")
            return "That code expired.";

        if (settingsPage.pairingStatus === "error")
            return settingsPage.pairingErrorMessage;

        return "";
    }

    function _commit() {
        const imageChanged = settingsPage.suspendImageDirty;
        const privateChanged = settingsPage.showPrivateDirty;
        const urlChanged = settingsPage.urlDirty;
        const imageValue = settingsPage.staged;
        const privateValue = settingsPage.stagedShowPrivate;
        const urlValue = settingsPage.stagedUrl.trim();
        settingsPage.forceActiveFocus();
        Qt.inputMethod.hide();
        if (imageChanged)
            settingsPage.applyRequested(imageValue);

        if (privateChanged)
            settingsPage.showPrivateHabitsApplied(privateValue);

        if (urlChanged)
            settingsPage.serverUrlApplied(urlValue);

        settingsPage.backRequested();
    }

    Component.onCompleted: settingsPage._resync()
    onVisibleChanged: {
        if (visible) {
            settingsPage._resync();
        }
    }
    // A committed change lands back here (the store properties follow), so re-sync the staged
    // values — Done becomes idle and dirty clears.
    onSuspendImageEnabledChanged: settingsPage._resync()
    onShowPrivateHabitsChanged: settingsPage._resync()
    onServerUrlChanged: settingsPage._resync()

    MouseArea {
        anchors.fill: parent
        onPressed: {
            settingsPage.forceActiveFocus();
            Qt.inputMethod.hide();
        }
    }

    Text {
        x: App.Theme.margin
        y: App.Theme.margin
        text: BuildProfile.isTest ? "Settings · TEST" : "Settings"
        font.pixelSize: App.Theme.titleFont
        color: App.Theme.fg
    }

    Rectangle {
        x: App.Theme.margin
        y: 162
        width: parent.width - 2 * x
        height: 2
        color: App.Theme.fg
    }

    Row {
        readonly property real columnWidth: (width - spacing) / 2

        x: App.Theme.margin
        y: 210
        width: parent.width - 2 * x
        spacing: 100

        Column {
            width: parent.columnWidth
            spacing: 28

            Text {
                text: "On this tablet"
                font.pixelSize: 42
                color: App.Theme.fg
            }

            Rectangle {
                width: parent.width
                height: 2
                color: App.Theme.rule
            }

            Item {
                width: parent.width
                height: 122

                Column {
                    width: parent.width - 208
                    spacing: 12

                    Text {
                        width: parent.width
                        text: BuildProfile.isTest ? "Save local suspend preview" : "Power-state habit images"
                        font.pixelSize: 32
                        color: App.Theme.fg
                        wrapMode: Text.WordWrap
                    }

                    Text {
                        width: parent.width
                        text: BuildProfile.isTest ? "Preview file inside the test app only." : "Sleeping, powered off, and battery empty."
                        font.pixelSize: 26
                        color: App.Theme.muted
                        wrapMode: Text.WordWrap
                    }

                }

                SegmentedToggle {
                    anchors.right: parent.right
                    value: settingsPage.staged
                    segmentWidth: 92
                    segmentHeight: 72
                    enabled: !settingsPage.suspendImageBusy
                    onToggled: settingsPage.staged = value
                }

            }

            Text {
                width: parent.width
                text: BuildProfile.isTest ? "Use Developer options to write the device’s suspend image once, or restore it." : "Original images are backed up before replacement. Turn this off to restore them."
                font.pixelSize: 26
                color: App.Theme.muted
                wrapMode: Text.WordWrap
            }

            Rectangle {
                width: parent.width
                height: 2
                color: App.Theme.rule
            }

            Item {
                width: parent.width
                height: 112

                Column {
                    width: parent.width - 208
                    spacing: 12

                    Text {
                        text: "Show private habits"
                        font.pixelSize: 32
                        color: App.Theme.fg
                    }

                    Text {
                        width: parent.width
                        text: "Reveal private habits on this tablet."
                        font.pixelSize: 26
                        color: App.Theme.muted
                        wrapMode: Text.WordWrap
                    }

                }

                SegmentedToggle {
                    anchors.right: parent.right
                    value: settingsPage.stagedShowPrivate
                    segmentWidth: 92
                    segmentHeight: 72
                    onToggled: settingsPage.stagedShowPrivate = value
                }

            }

            Text {
                width: parent.width
                text: "Private habits never appear on power-state images."
                font.pixelSize: 26
                color: App.Theme.muted
                wrapMode: Text.WordWrap
            }

        }

        Column {
            width: parent.columnWidth
            spacing: 20

            Text {
                text: "Sync & pairing"
                font.pixelSize: 42
                color: App.Theme.fg
            }

            Item {
                width: 1
                height: 4
            }

            Text {
                text: "Sync server"
                font.pixelSize: 32
                color: App.Theme.fg
            }

            Rectangle {
                width: parent.width
                height: 78
                color: App.Theme.bg
                radius: 6
                border.width: 2
                border.color: "#888888"

                TextInput {
                    id: urlInput

                    anchors.fill: parent
                    anchors.margins: 16
                    text: settingsPage.stagedUrl
                    font.pixelSize: 32
                    color: App.Theme.fg
                    clip: true
                    selectByMouse: true
                    verticalAlignment: TextInput.AlignVCenter
                    inputMethodHints: Qt.ImhUrlCharactersOnly | Qt.ImhNoAutoUppercase
                    onTextChanged: settingsPage.stagedUrl = text
                }

                Text {
                    anchors.fill: urlInput
                    text: "http://address:5137"
                    visible: !urlInput.text && !urlInput.activeFocus
                    font.pixelSize: 32
                    color: App.Theme.muted
                    verticalAlignment: Text.AlignVCenter
                }

            }

            Text {
                width: parent.width
                text: settingsPage.urlDirty ? "Save with Done before connecting. Leave blank to work offline." : "Leave blank to use this tablet offline."
                font.pixelSize: 26
                color: App.Theme.muted
                wrapMode: Text.WordWrap
            }

            Text {
                visible: BuildProfile.isTest
                width: parent.width
                text: "Use a separate test account or server. Sync changes the connected account’s habits."
                font.pixelSize: 26
                color: App.Theme.muted
                wrapMode: Text.WordWrap
            }

            Row {
                spacing: 24

                AppButton {
                    width: 198
                    height: 72
                    text: "Sync now"
                    disabled: !settingsPage.serverUrlReady
                    onClicked: settingsPage.syncNowRequested()
                }

                Text {
                    width: 590
                    height: 72
                    verticalAlignment: Text.AlignVCenter
                    text: settingsPage.syncStatusText
                    elide: Text.ElideRight
                    font.pixelSize: 26
                    color: App.Theme.muted
                }

            }

            Item {
                height: 10
                width: 1
            }

            Rectangle {
                width: parent.width
                height: 2
                color: App.Theme.rule
            }

            Text {
                text: "Tablet pairing"
                font.pixelSize: 42
                color: App.Theme.fg
            }

            Row {
                visible: settingsPage.pairingConnected
                spacing: 24

                Text {
                    text: "Tablet connected"
                    height: 72
                    verticalAlignment: Text.AlignVCenter
                    font.pixelSize: 32
                    color: App.Theme.fg
                }

                AppButton {
                    width: 212
                    height: 72
                    text: "Disconnect"
                    onClicked: settingsPage.disconnectRequested()
                }

            }

            Text {
                visible: settingsPage.pairingConnected
                width: parent.width
                text: "Disconnecting signs out this tablet. Revoke its access from your phone’s linked devices."
                font.pixelSize: 26
                color: App.Theme.muted
                wrapMode: Text.WordWrap
            }

            Text {
                visible: !settingsPage.pairingConnected && settingsPage.pairingStatus !== "waiting"
                width: parent.width
                text: settingsPage._pairingHintText() || "Approve this tablet from your phone to sync your habits."
                font.pixelSize: 26
                color: App.Theme.muted
                wrapMode: Text.WordWrap
            }

            AppButton {
                visible: !settingsPage.pairingConnected && settingsPage.pairingStatus !== "waiting"
                width: 200
                height: 72
                text: settingsPage.pairingStatus === "expired" ? "New code" : "Connect"
                disabled: !settingsPage.serverUrlReady || settingsPage.pairingRequestInFlight
                onClicked: settingsPage.connectRequested()
            }

            Row {
                visible: settingsPage.pairingStatus === "waiting"
                width: parent.width
                spacing: 24

                Column {
                    anchors.verticalCenter: parent.verticalCenter
                    width: parent.width - 320
                    spacing: 20

                    Text {
                        width: parent.width
                        text: "Scan with Habit Tracker on your phone."
                        font.pixelSize: 28
                        color: App.Theme.fg
                        wrapMode: Text.WordWrap
                    }

                    Text {
                        text: settingsPage.pairingCode
                        font.pixelSize: 64
                        font.letterSpacing: 6
                        color: App.Theme.fg
                    }

                    Text {
                        width: parent.width
                        text: "Or enter this code manually."
                        font.pixelSize: 26
                        color: App.Theme.muted
                        wrapMode: Text.WordWrap
                    }

                }

                QrCode {
                    width: 296
                    height: width
                    payload: settingsPage.pairingCode
                }

            }

            Text {
                visible: settingsPage.pairingStatus === "waiting"
                text: "Waiting for approval · Code expires after 5 minutes"
                font.pixelSize: 26
                color: App.Theme.muted
            }

        }

    }

    AppButton {
        x: App.Theme.margin
        y: parent.height - 154
        width: 160
        height: 72
        text: "Back"
        onClicked: settingsPage.dirty ? unsavedDialog.visible = true : settingsPage.backRequested()
    }

    Text {
        visible: !BuildProfile.isTest
        anchors.horizontalCenter: parent.horizontalCenter
        y: parent.height - 134
        text: settingsPage.dirty ? "Unsaved changes" : "Changes apply on Done"
        font.pixelSize: 28
        color: App.Theme.muted
    }

    AppButton {
        anchors.right: parent.right
        anchors.rightMargin: App.Theme.margin
        y: parent.height - 154
        width: 160
        height: 72
        text: "Done"
        active: true
        disabled: settingsPage.suspendImageBusy
        onClicked: settingsPage._commit()
    }

    AppButton {
        anchors.horizontalCenter: parent.horizontalCenter
        y: parent.height - 154
        width: 360
        height: 72
        visible: BuildProfile.isTest
        disabled: settingsPage.dirty
        text: "Developer options"
        onClicked: settingsPage.developerRequested()
    }

    ScreenStatus {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        leftText: settingsPage.syncStatusText
    }

    ConfirmDialog {
        id: unsavedDialog

        visible: false
        message: "Discard unsaved settings changes?"
        confirmText: "Discard"
        onConfirmed: {
            visible = false;
            settingsPage.backRequested();
        }
        onCancelled: visible = false
    }

}
