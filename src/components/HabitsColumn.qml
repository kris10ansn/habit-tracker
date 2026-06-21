import QtQuick 2.15
import ".." as App

Item {
    id: habitsColumn

    property var habits: []
    property bool editing: false
    property bool suspendImageEnabled: false
    property int rowWidth: App.Theme.habitsWidth
    property int scrollY: 0
    property real viewportHeight: 0

    signal removeRequested(int index)
    signal negativeToggled(int index)
    signal hideFromSleepToggled(int index)
    signal nameEdited(int index, string newName)
    signal moveRequested(int from, int to)
    signal addRequested(string name, bool negative)

    width: rowWidth
    height: viewportHeight
    clip: true

    Item {
        id: header
        width: habitsColumn.rowWidth
        height: App.Theme.dayLabelHeight
    }

    Item {
        id: bodyViewport
        y: header.height + App.Theme.rowSpacing
        width: habitsColumn.rowWidth
        height: habitsColumn.height - y
        clip: true

        Column {
            id: body
            y: -habitsColumn.scrollY
            spacing: App.Theme.rowSpacing

            Repeater {
                model: habitsColumn.habits

                HabitRow {
                    width: habitsColumn.rowWidth
                    name: model.name
                    negative: model.negative
                    hideFromSleep: !!model.hideFromSleep
                    editing: habitsColumn.editing
                    suspendImageEnabled: habitsColumn.suspendImageEnabled
                    canMoveUp: index > 0
                    canMoveDown: index < habitsColumn.habits.count - 1
                    onRemoveClicked: habitsColumn.removeRequested(index)
                    onNegativeToggled: habitsColumn.negativeToggled(index)
                    onHideFromSleepToggled: habitsColumn.hideFromSleepToggled(index)
                    onNameEdited: habitsColumn.nameEdited(index, newName)
                    onMoveUpClicked: habitsColumn.moveRequested(index, index - 1)
                    onMoveDownClicked: habitsColumn.moveRequested(index, index + 1)
                }
            }

            HabitAddRow {
                width: habitsColumn.rowWidth
                visible: habitsColumn.editing
                onAddRequested: habitsColumn.addRequested(name, negative)
            }
        }
    }
}
