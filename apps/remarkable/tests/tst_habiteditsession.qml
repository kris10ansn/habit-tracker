import QtQuick 2.15
import QtTest 1.2
import "../src" as App
import "../src/js/HabitEdits.js" as HabitEdits

TestCase {
    function init() {
        source.clear();
        source.append({
            "id": "a",
            "name": "Read",
            "polarity": "Positive",
            "isPrivate": false
        });
        source.append({
            "id": "b",
            "name": "Private",
            "polarity": "Positive",
            "isPrivate": true
        });
        source.append({
            "id": "c",
            "name": "Walk",
            "polarity": "Negative",
            "isPrivate": false
        });
        session.begin(source, false);
    }

    function cleanup() {
        session.finish();
    }

    function test_privacyAndPolarityStayInDraftUntilDone() {
        session.togglePrivate(0);
        session.togglePolarity(0);
        session.setName(0, "  Read books  ");
        compare(session.habits.get(0).editVisible, true);
        compare(session.habits.get(1).editVisible, false);
        compare(source.get(0).isPrivate, false);
        compare(source.get(0).polarity, "Positive");
        compare(source.get(0).name, "Read");
        const changes = HabitEdits.changes(session.original, HabitEdits.snapshot(session.habits));
        compare(changes.updated, [{
            "id": "a",
            "fields": {
                "name": "Read books",
                "polarity": "Negative",
                "isPrivate": true
            }
        }]);
        compare(changes.reordered, false);
    }

    function test_cancelDiscardsEveryKindOfEdit() {
        session.setName(0, "Different");
        session.togglePrivate(0);
        session.move(0, 1);
        session.remove(1);
        session.add("New", "Negative");
        session.finish();
        session.begin(source, false);
        compare(HabitEdits.snapshot(session.habits), HabitEdits.snapshot(source));
    }

    function test_reorderingSkipsInitiallyHiddenRows() {
        session.move(0, 1);
        compare(HabitEdits.snapshot(session.habits).map((row) => {
            return row.id;
        }), ["b", "c", "a"]);
        compare(HabitEdits.changes(session.original, HabitEdits.snapshot(session.habits)).reordered, true);
    }

    function test_addAndDeleteDraftDoNotCreateAChange() {
        session.add("  ", "Positive");
        compare(session.habits.count, 3);
        session.add("New", "Negative");
        session.remove(3);
        const changes = HabitEdits.changes(session.original, HabitEdits.snapshot(session.habits));
        compare(changes.added.length, 0);
        compare(changes.removed.length, 0);
        compare(changes.updated.length, 0);
        compare(changes.reordered, false);
    }

    name: "HabitEditSession"

    ListModel {
        id: source

        dynamicRoles: true
    }

    App.HabitEditSession {
        id: session
    }

}
