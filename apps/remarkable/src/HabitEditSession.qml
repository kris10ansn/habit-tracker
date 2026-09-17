import QtQuick 2.15
import "js/HabitEdits.js" as HabitEdits
import "js/Polarity.js" as Polarity

QtObject {
    id: session

    property var original: []
    property bool active: false
    property int nextId: 0
    property ListModel habits

    habits: ListModel {
        dynamicRoles: true
    }

    function begin(source, showPrivate) {
        session.original = HabitEdits.snapshot(source);
        session.habits.clear();
        session.original.forEach((habit) => {
            return session.habits.append(Object.assign({
            }, habit, {
                "editVisible": showPrivate || !habit.isPrivate
            }));
        });
        session.active = true;
    }

    function finish() {
        session.active = false;
        session.habits.clear();
        session.original = [];
    }

    function setName(index, name) {
        const trimmed = name.trim();
        if (trimmed)
            session.habits.setProperty(index, "name", trimmed);

    }

    function togglePolarity(index) {
        session.habits.setProperty(index, "polarity", Polarity.toggled(session.habits.get(index).polarity));
    }

    function togglePrivate(index) {
        session.habits.setProperty(index, "isPrivate", !session.habits.get(index).isPrivate);
    }

    function add(name, polarity) {
        const trimmed = name.trim();
        if (!trimmed)
            return ;

        session.nextId++;
        session.habits.append({
            "id": "draft-" + session.nextId,
            "name": trimmed,
            "polarity": polarity,
            "isPrivate": false,
            "editVisible": true
        });
    }

    function remove(index) {
        session.habits.remove(index);
    }

    function move(index, direction) {
        const target = HabitEdits.visibleNeighborIndex(session.habits, index, direction);
        if (target >= 0)
            session.habits.move(index, target, 1);

    }

}
