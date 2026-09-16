import QtQuick 2.15
import ".." as App
import "../js/Polarity.js" as Polarity
import "../js/Scroll.js" as Scroll

Item {
    id: page

    property var habits
    property real scrollY: 0
    property int pendingDelete: -1
    property string syncStatusText: ""
    property string suspendStatusText: ""
    readonly property real viewportHeight: Math.max(1, height - 564)
    readonly property real maxScrollY: Math.max(0, rows.height - viewportHeight)
    readonly property int pageRows: Math.max(1, Math.floor(viewportHeight / App.Theme.editorRowHeight) - 1)

    signal doneRequested()
    signal cancelRequested()
    signal nameEdited(int index, string name)
    signal polarityToggled(int index)
    signal privateToggled(int index)
    signal moveRequested(int index, int direction)
    signal removeRequested(int index)
    signal addRequested(string name, string polarity)

    function finish() {
        page.forceActiveFocus();
        Qt.inputMethod.hide();
        page.doneRequested();
    }

    onMaxScrollYChanged: scrollY = Math.max(0, Math.min(scrollY, maxScrollY))
    onVisibleChanged: {
        if (visible) {
            scrollY = 0;
        }
    }

    MouseArea {
        anchors.fill: parent
        onPressed: {
            page.forceActiveFocus();
            Qt.inputMethod.hide();
        }
    }

    Text {
        x: App.Theme.margin
        y: App.Theme.margin
        text: "Edit habits"
        color: App.Theme.fg
        font.pixelSize: App.Theme.titleFont
    }

    Row {
        anchors.top: parent.top
        anchors.right: parent.right
        anchors.margins: App.Theme.margin
        spacing: 20

        AppButton {
            width: 160
            height: 72
            text: "Cancel"
            quiet: true
            onClicked: discardDialog.visible = true
        }

        AppButton {
            width: 160
            height: 72
            text: "Done"
            active: true
            onClicked: page.finish()
        }

    }

    Rectangle {
        x: App.Theme.margin
        y: 162
        width: parent.width - 2 * x
        height: 2
        color: App.Theme.fg
    }

    Item {
        id: editor

        readonly property real nameWidth: Math.max(100, width - 784)

        x: App.Theme.margin
        y: 210
        width: parent.width - 2 * x - 110
        height: 60 + page.viewportHeight

        Row {
            height: 60
            spacing: 24

            Text {
                width: editor.nameWidth
                text: "Habit name"
                color: App.Theme.muted
                font.pixelSize: 28
            }

            Text {
                width: 236
                text: "Polarity"
                color: App.Theme.muted
                font.pixelSize: 28
            }

            Text {
                width: 212
                text: "Visibility"
                color: App.Theme.muted
                font.pixelSize: 28
            }

            Text {
                width: 264
                text: "Order / remove"
                color: App.Theme.muted
                font.pixelSize: 28
            }

        }

        Rectangle {
            y: 58
            width: parent.width
            height: 2
            color: App.Theme.fg
        }

        Item {
            y: 60
            width: parent.width
            height: page.viewportHeight
            clip: true

            Column {
                id: rows

                y: -page.scrollY
                width: parent.width

                Repeater {
                    model: page.habits

                    Item {
                        id: editorRow

                        readonly property int rowIndex: index

                        width: rows.width
                        height: App.Theme.editorRowHeight
                        visible: model.editVisible

                        Row {
                            anchors.verticalCenter: parent.verticalCenter
                            spacing: 24

                            Rectangle {
                                width: editor.nameWidth
                                height: 78
                                color: App.Theme.bg
                                radius: 6
                                border.width: 2
                                border.color: "#888888"

                                TextInput {
                                    objectName: "habit-name-" + model.id
                                    anchors.fill: parent
                                    anchors.margins: 16
                                    text: model.name
                                    font.pixelSize: 32
                                    color: App.Theme.fg
                                    verticalAlignment: TextInput.AlignVCenter
                                    selectByMouse: true
                                    clip: true
                                    onEditingFinished: {
                                        page.nameEdited(editorRow.rowIndex, text);
                                        text = model.name;
                                    }
                                }

                            }

                            AppButton {
                                objectName: "habit-polarity-" + model.id
                                width: 236
                                height: 72
                                text: model.polarity
                                active: Polarity.isNegative(model.polarity)
                                onClicked: page.polarityToggled(editorRow.rowIndex)
                            }

                            AppButton {
                                objectName: "habit-private-" + model.id
                                width: 212
                                height: 72
                                text: model.isPrivate ? "Private" : "Public"
                                active: model.isPrivate
                                onClicked: page.privateToggled(editorRow.rowIndex)
                            }

                            Row {
                                spacing: 8

                                AppButton {
                                    width: 80
                                    height: 72
                                    text: "↑"
                                    disabled: editorRow.rowIndex === 0
                                    onClicked: page.moveRequested(editorRow.rowIndex, -1)
                                }

                                AppButton {
                                    width: 80
                                    height: 72
                                    text: "↓"
                                    disabled: editorRow.rowIndex === page.habits.count - 1
                                    onClicked: page.moveRequested(editorRow.rowIndex, 1)
                                }

                                AppButton {
                                    width: 80
                                    height: 72
                                    text: "×"
                                    onClicked: page.pendingDelete = editorRow.rowIndex
                                }

                            }

                        }

                        Rectangle {
                            anchors.bottom: parent.bottom
                            width: parent.width
                            height: 2
                            color: App.Theme.rule
                        }

                    }

                }

            }

        }

    }

    VerticalScrollButtons {
        anchors.right: parent.right
        anchors.rightMargin: App.Theme.margin
        y: 218
        visible: page.maxScrollY > 0
        buttonHeight: (page.viewportHeight - App.Theme.rowSpacing) / 2
        upDisabled: page.scrollY <= 0
        downDisabled: page.scrollY >= page.maxScrollY
        onScrollUp: page.scrollY = Scroll.scrollByBoxes(page.scrollY, -page.pageRows, App.Theme.editorRowHeight, page.maxScrollY)
        onScrollDown: page.scrollY = Scroll.scrollByBoxes(page.scrollY, page.pageRows, App.Theme.editorRowHeight, page.maxScrollY)
    }

    HabitAddRow {
        x: App.Theme.margin
        y: editor.y + editor.height + 26
        width: Math.min(1200, editor.width)
        height: 78
        onAddRequested: {
            page.addRequested(name, polarity);
            Qt.callLater(() => {
                return page.scrollY = page.maxScrollY;
            });
        }
    }

    Text {
        x: App.Theme.margin
        y: parent.height - 132
        text: "Changes apply on Done"
        font.pixelSize: 28
        color: App.Theme.muted
    }

    Text {
        anchors.right: parent.right
        anchors.rightMargin: App.Theme.margin
        y: parent.height - 132
        text: "Private habits stay off power-state images."
        font.pixelSize: 28
        color: App.Theme.muted
    }

    ScreenStatus {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        leftText: page.syncStatusText
        rightText: page.suspendStatusText
    }

    ConfirmDialog {
        visible: page.pendingDelete >= 0
        message: visible ? "Delete “" + page.habits.get(page.pendingDelete).name + "” when you press Done?" : ""
        onConfirmed: {
            page.forceActiveFocus();
            Qt.inputMethod.hide();
            const index = page.pendingDelete;
            page.pendingDelete = -1;
            page.removeRequested(index);
        }
        onCancelled: page.pendingDelete = -1
    }

    ConfirmDialog {
        id: discardDialog

        visible: false
        message: "Discard these habit edits?"
        confirmText: "Discard"
        onConfirmed: {
            page.forceActiveFocus();
            Qt.inputMethod.hide();
            visible = false;
            page.cancelRequested();
        }
        onCancelled: visible = false
    }

}
