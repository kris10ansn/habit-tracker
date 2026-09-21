import QtQuick 2.15
import QtTest 1.2
import "../src" as App
import "Fixtures.js" as Fixtures

TestCase {
    id: testCase
    name: "PowerImages"
    when: windowShown
    visible: true
    width: 200
    height: 200
    property var requests: []
    property var store: null
    property int clicks: 0
    Component { id: factory; App.PowerImageStore {} }
    MouseArea { id: input; width: 100; height: 100; onClicked: testCase.clicks++ }

    function init() {
        requests = [];
        clicks = 0;
        store = createTemporaryObject(factory, testCase, {
            habits: Fixtures.fakeModel([Fixtures.habitRow()]),
            today: new Date(2026, 7, 17), renderAllowed: true,
            sendRequest: function (operation, payload, onDone, onAccepted) {
                requests.push({ operation: operation, payload: payload, finish: onDone, accept: onAccepted });
            }
        });
    }
    function test_inputRunsBeforeHeldRenderCompletes() {
        store.renderAsync();
        compare(requests.length, 1);
        compare(requests[0].operation, "render");
        verify(store.busy);
        mouseClick(input, 30, 30);
        compare(clicks, 1);
        verify(store.busy, "Input must be handled while image generation is still outstanding");
        requests[0].finish({ ok: true });
        verify(!store.busy);
    }
    function test_rapidEditsCoalesceToLatestSnapshot() {
        store.renderAsync();
        store.habits = Fixtures.fakeModel([Fixtures.habitRow({ name: "Second" })]);
        store.scheduleRender();
        store.habits = Fixtures.fakeModel([Fixtures.habitRow({ name: "Newest" })]);
        store.scheduleRender();
        compare(requests.length, 1);
        requests[0].finish({ ok: true });
        store.renderAsync();
        compare(requests.length, 2);
        compare(requests[1].payload.roster.habits[0].name, "Newest");
        compare(requests[0].payload.roster.habits[0].name, "Read 20 pages");
        requests[1].finish({ ok: true });
        store.renderAsync();
        compare(requests.length, 2);
    }
    function test_restoreSupersedesRenderingAndStaleCompletion() {
        store.renderAsync();
        let restored = false;
        store.restore(ok => restored = ok);
        compare(requests[1].operation, "restore");
        requests[0].finish({ ok: false, cancelled: true });
        compare(store.phase, "restoring");
        verify(store.busy);
        requests[1].finish({ ok: true });
        verify(restored);
        compare(store.phase, "restored");
        store.renderAsync();
        compare(requests.length, 2);
    }
    function test_failedRestoreKeepsAutomaticWritingPaused() {
        store.restore(ok => verify(!ok));
        requests[0].finish({ ok: false, path: "backup.png" });
        verify(store.restorationPending);
        compare(store.failedPath, "backup.png");
        store.scheduleRender();
        compare(requests.length, 1);
    }
    function test_backupFailureIsReported() {
        store.backup(ok => verify(!ok));
        requests[0].finish({ ok: false, error: "Helper unavailable" });
        compare(store.phase, "backup-failed");
        verify(!store.busy);
    }
    function test_quitWaitsForAcceptanceNotRendering() {
        let ready = false;
        store.submitForQuit(() => ready = true);
        verify(!ready);
        requests[0].accept();
        verify(ready);
        // Completion must not close a second time.
        let calls = 0;
        store.submitForQuit(() => calls++);
        requests[1].accept();
        requests[1].finish({ ok: true });
        compare(calls, 1);
    }
    function test_unavailableHelperDoesNotTrapQuit() {
        let ready = false;
        store.submitForQuit(() => ready = true);
        requests[0].finish({ ok: false, error: "Helper unavailable" });
        verify(ready);
        verify(store.lastRenderFailed);
    }
    function test_previewUsesHelperAndDoesNotEnableAutomaticWrites() {
        store.renderAllowed = false;
        let done = false;
        store.renderOnce(ok => done = ok);
        compare(requests[0].operation, "preview");
        mouseClick(input, 30, 30);
        compare(clicks, 1);
        requests[0].finish({ ok: true });
        verify(done);
        verify(!store.renderAllowed);
    }
}
