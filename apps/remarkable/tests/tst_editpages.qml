import QtQuick 2.15
import QtTest 1.2
import "../src" as App
import "../src/components" as Components

TestCase {
    id: testCase

    function test_doneCommitsFocusedNameBeforeEmittingDone() {
        source.clear();
        source.append({
            "id": "a",
            "name": "Read",
            "polarity": "Positive",
            "isPrivate": false
        });
        session.begin(source, false);
        wait(0);
        const input = findChild(editor, "habit-name-a");
        verify(input !== null);
        input.forceActiveFocus();
        input.text = "Read every day";
        editor.finish();
        compare(doneSpy.count, 1);
        compare(session.habits.get(0).name, "Read every day");
        compare(source.get(0).name, "Read");
        editor.privateToggled(0);
        editor.polarityToggled(0);
        compare(findChild(editor, "habit-private-a").active, true);
        compare(findChild(editor, "habit-polarity-a").active, true);
        compare(session.habits.get(0).editVisible, true);
        session.finish();
    }

    function test_reorderButtonsFollowVisibleNeighbors_data() {
        return [
            { tag: "hidden-before", privateIndex: 0, habitId: "b", direction: "up", disabled: true },
            { tag: "hidden-after", privateIndex: 1, habitId: "a", direction: "down", disabled: true },
            { tag: "visible-before", privateIndex: -1, habitId: "b", direction: "up", disabled: false },
            { tag: "visible-after", privateIndex: -1, habitId: "a", direction: "down", disabled: false }
        ];
    }

    function test_reorderButtonsFollowVisibleNeighbors(data) {
        source.clear();
        ["a", "b"].forEach((id, index) => source.append({
            id: id, name: id, polarity: "Positive", isPrivate: index === data.privateIndex
        }));
        session.begin(source, false);
        wait(0);
        const input = findChild(editor, "habit-name-" + data.habitId);
        const row = input.parent.parent;
        const actions = row.children[row.children.length - 1];
        const button = actions.children[data.direction === "up" ? 0 : 1];
        compare(button.disabled, data.disabled);

        if (!data.disabled) {
            button.clicked();
            compare(session.habits.get(0).id, "b");
            compare(button.disabled, true);
        }
        session.finish();
    }

    function test_settingsCommitKeepsAllStagedChangesWhenStoresResync() {
        settings.suspendImageEnabled = false;
        settings.showPrivateHabits = false;
        settings.serverUrl = "";
        settings.staged = true;
        settings.stagedShowPrivate = true;
        settings.stagedUrl = "https://example.test";
        settings._commit();
        compare(settings.suspendImageEnabled, true);
        compare(settings.showPrivateHabits, true);
        compare(settings.serverUrl, "https://example.test");
        compare(settings.dirty, false);
    }

    name: "EditPages"
    width: 1872
    height: 1404
    when: windowShown

    ListModel {
        id: source

        dynamicRoles: true
    }

    App.HabitEditSession {
        id: session
    }

    Components.HabitEditorPage {
        id: editor

        anchors.fill: parent
        habits: session.habits
        onNameEdited: session.setName(index, name)
        onMoveRequested: session.move(index, direction)
        onPrivateToggled: session.togglePrivate(index)
        onPolarityToggled: session.togglePolarity(index)
    }

    Components.SettingsPage {
        id: settings

        anchors.fill: parent
        visible: false
        onApplyRequested: suspendImageEnabled = value
        onShowPrivateHabitsApplied: showPrivateHabits = value
        onServerUrlApplied: serverUrl = url
    }

    SignalSpy {
        id: doneSpy

        target: editor
        signalName: "doneRequested"
    }

}
