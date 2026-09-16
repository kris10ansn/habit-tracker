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
