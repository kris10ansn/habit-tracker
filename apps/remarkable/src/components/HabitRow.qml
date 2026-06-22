import QtQuick 2.15
import ".." as App

Row {
    id: habitRow

    property string name: ""
    property bool negative: false
    property bool hideFromSleep: false
    property bool editing: false
    property bool suspendImageEnabled: false
    property bool canMoveUp: false
    property bool canMoveDown: false
    signal removeClicked
    signal negativeToggled
    signal hideFromSleepToggled
    signal nameEdited(string newName)
    signal moveUpClicked
    signal moveDownClicked

    width: App.Theme.habitsWidth
    height: App.Theme.boxSize
    spacing: App.Theme.boxSpacing

    Row {
        id: reorderRow
        height: App.Theme.deleteButtonSize
        spacing: App.Theme.boxSpacing
        anchors.verticalCenter: parent.verticalCenter
        visible: habitRow.editing

        AppButton {
            width: App.Theme.deleteButtonSize
            height: App.Theme.deleteButtonSize
            text: "↑"
            disabled: !habitRow.canMoveUp
            onClicked: habitRow.moveUpClicked()
        }

        AppButton {
            width: App.Theme.deleteButtonSize
            height: App.Theme.deleteButtonSize
            text: "↓"
            disabled: !habitRow.canMoveDown
            onClicked: habitRow.moveDownClicked()
        }
    }

    AppButton {
        id: deleteButton
        width: App.Theme.deleteButtonSize
        height: App.Theme.deleteButtonSize
        anchors.verticalCenter: parent.verticalCenter
        visible: habitRow.editing
        text: "×"
        onClicked: habitRow.removeClicked()
    }

    Item {
        id: nameSlot
        // Edit controls flanking the name: ↑ ↓ × −, plus Z only when the
        // suspend image is being written.
        readonly property int editControls: habitRow.suspendImageEnabled ? 5 : 4
        width: habitRow.width - (habitRow.editing ? editControls * (App.Theme.deleteButtonSize + habitRow.spacing) : 0)
        height: habitRow.height

        Text {
            anchors.fill: parent
            visible: !habitRow.editing
            text: habitRow.negative ? habitRow.name + " (-)" : habitRow.name
            font.pixelSize: App.Theme.labelFont
            color: App.Theme.fg
            verticalAlignment: Text.AlignVCenter
            elide: Text.ElideRight
        }

        Rectangle {
            anchors.fill: parent
            visible: habitRow.editing
            color: App.Theme.bg
            border.color: App.Theme.fg
            border.width: App.Theme.borderWidth

            TextInput {
                id: nameInput
                anchors.fill: parent
                anchors.margins: App.Theme.inputPadding
                text: habitRow.name
                font.pixelSize: App.Theme.labelFont
                color: App.Theme.fg
                verticalAlignment: TextInput.AlignVCenter
                clip: true
                selectByMouse: true

                onEditingFinished: {
                    const trimmed = text.trim();
                    if (!trimmed || trimmed === habitRow.name) {
                        text = habitRow.name;
                        return;
                    }
                    habitRow.nameEdited(trimmed);
                }
            }
        }
    }

    AppButton {
        id: negativeButton
        width: App.Theme.deleteButtonSize
        height: App.Theme.deleteButtonSize
        anchors.verticalCenter: parent.verticalCenter
        visible: habitRow.editing
        text: "−"
        active: habitRow.negative
        onClicked: habitRow.negativeToggled()
    }

    AppButton {
        id: hideFromSleepButton
        width: App.Theme.deleteButtonSize
        height: App.Theme.deleteButtonSize
        anchors.verticalCenter: parent.verticalCenter
        visible: habitRow.editing && habitRow.suspendImageEnabled
        text: "Z"
        active: !habitRow.hideFromSleep
        onClicked: habitRow.hideFromSleepToggled()
    }
}
