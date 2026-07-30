import QtQuick 2.15
import ".." as App
import "../js/Polarity.js" as Polarity

Row {
    id: addRow

    property string polarity: Polarity.POSITIVE
    signal addRequested(string name, string polarity)

    width: App.Theme.habitsWidth
    height: App.Theme.boxSize
    spacing: App.Theme.boxSpacing

    onVisibleChanged: if (!visible) {
        input.focus = false;
        Qt.inputMethod.hide();
        addRow.polarity = Polarity.POSITIVE;
    }

    function submit() {
        if (!input.text.trim()) {
            return;
        }

        addRow.addRequested(input.text, addRow.polarity);
        input.text = "";
        addRow.polarity = Polarity.POSITIVE;
    }

    Rectangle {
        width: addRow.width - addButton.width - addRow.spacing - polarityButton.width - addRow.spacing
        height: addRow.height
        color: App.Theme.bg
        border.color: App.Theme.fg
        border.width: App.Theme.borderWidth

        TextInput {
            id: input
            anchors.fill: parent
            anchors.margins: App.Theme.inputPadding
            font.pixelSize: App.Theme.labelFont
            color: App.Theme.fg
            verticalAlignment: TextInput.AlignVCenter
            clip: true
            selectByMouse: true
            onAccepted: addRow.submit()
        }

        Text {
            anchors.fill: input
            text: "New habit…"
            color: App.Theme.fg
            opacity: App.Theme.fadedOpacity
            font.pixelSize: input.font.pixelSize
            verticalAlignment: Text.AlignVCenter
            visible: input.text.length === 0 && !input.activeFocus
        }
    }

    AppButton {
        id: polarityButton
        width: App.Theme.deleteButtonSize
        height: addRow.height
        text: "−"
        active: Polarity.isNegative(addRow.polarity)
        onClicked: addRow.polarity = Polarity.toggled(addRow.polarity)
    }

    AppButton {
        id: addButton
        width: App.Theme.deleteButtonSize
        height: addRow.height
        text: "+"
        onClicked: addRow.submit()
    }
}
