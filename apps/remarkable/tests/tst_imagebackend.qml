import QtQuick 2.15
import QtTest 1.2
import "../src/components" as App
import "../src/js/ImageProtocol.js" as ImageProtocol
import "Fixtures.js" as Fixtures

TestCase {
    id: testCase
    name: "ImageBackend"
    when: windowShown

    property var endpoint: null
    property var client: null
    property var controller: null
    property int ticks: 0

    Timer { interval: 10; repeat: true; running: true; onTriggered: testCase.ticks++ }
    Component {
        id: transportComponent
        Item {
            property var sent: []
            signal message(string body)
            function send(body) {
                const request = JSON.parse(body);
                if (request.operation !== "hello") sent = sent.concat([request]);
            }
            function reply(body) { message(JSON.stringify(body)); }
        }
    }
    Component { id: clientComponent; App.ImageBackend {} }
    Component { id: controllerComponent; App.PowerImageController {} }

    function init() {
        endpoint = transportComponent.createObject(testCase);
        client = clientComponent.createObject(testCase, { transport: endpoint, startupTimeout: 200, operationTimeout: 200 });
    }
    function cleanup() {
        if (controller) controller.destroy();
        controller = null;
        client.destroy();
        endpoint.destroy();
    }
    function ready(busy = false) {
        endpoint.reply({ kind: "ready", version: 1, ready: true, busy: busy });
    }
    function complete(index, ok = true) {
        endpoint.reply({ kind: "done", id: endpoint.sent[index].id, ok: ok });
    }

    function test_queuesUntilHandshakeAndCorrelatesReplies() {
        let result = null;
        client.request("backup", {}, reply => result = reply);
        verify(client.busy);
        compare(endpoint.sent.length, 0);
        ready();
        compare(endpoint.sent.length, 1);
        endpoint.reply({ kind: "done", id: "someone-else", ok: true });
        verify(client.busy);
        compare(result, null);
        complete(0);
        verify(result.ok);
        verify(!client.busy);
    }
    function test_uiTimerContinuesWhileJobIsOutstanding() {
        ready();
        let result = null;
        client.request("backup", {}, reply => result = reply);
        const before = ticks;
        wait(80);
        verify(ticks >= before + 3);
        verify(client.busy);
        compare(result, null);
        complete(0);
        verify(result.ok);
    }
    function test_overlappingRequestIsRejectedWithoutDisturbingActiveJob() {
        ready();
        let first = null;
        let second = null;
        client.request("backup", {}, result => first = result);
        client.request("restore", {}, result => second = result);
        verify(!second.ok);
        compare(endpoint.sent.length, 1);
        complete(0);
        verify(first.ok);
    }
    function test_startupFailureCanRetryAfterWorkerReturns() {
        client.startupTimeout = 30;
        let result = null;
        client.request("backup", {}, reply => result = reply);
        tryVerify(() => result !== null);
        verify(!result.ok);
        compare(endpoint.sent.length, 0);
        ready();
        client.request("backup", {}, reply => result = reply);
        complete(0);
        verify(result.ok);
    }
    function test_unknownCompletionRequiresReopenAndIgnoresLateReply() {
        ready();
        client.operationTimeout = 30;
        let calls = 0;
        let result = null;
        client.request("backup", {}, reply => { calls++; result = reply; });
        endpoint.reply({ kind: "done", id: "unrelated", ok: true });
        tryVerify(() => calls === 1);
        verify(!result.ok);
        verify(result.error.indexOf("reopen") >= 0);
        complete(0);
        compare(calls, 1);
        ready();
        client.request("restore", {}, reply => result = reply);
        verify(!result.ok);
        compare(endpoint.sent.length, 1);
    }
    function test_reopenedFrontendTimesOutIfPreviousWorkerStalls() {
        client.operationTimeout = 30;
        ready(true);
        verify(client.busy);
        tryVerify(() => !client.busy);
        let result = null;
        client.request("backup", {}, reply => result = reply);
        verify(!result.ok);
        verify(result.error.indexOf("reopen") >= 0);
        compare(endpoint.sent.length, 0);
    }
    function test_heartbeatsCannotKeepAnUnfinishedJobBusy() {
        ready();
        client.operationTimeout = 60;
        let result = null;
        client.request("backup", {}, reply => result = reply);
        for (let index = 0; index < 5; index++) {
            endpoint.reply({ kind: "heartbeat", id: endpoint.sent[0].id });
            wait(25);
        }
        verify(result !== null && !result.ok);
        verify(!client.busy);
        complete(0);
        verify(!result.ok);
    }
    function test_progressCannotExceedTotalOperationLimit() {
        ready();
        client.operationTimeout = 60;
        client.maximumOperationDuration = 100;
        let result = null;
        client.request("backup", {}, reply => result = reply);
        for (let index = 0; index < 6; index++) {
            endpoint.reply({ kind: "progress", id: endpoint.sent[0].id, phase: "saving" });
            wait(25);
        }
        verify(result !== null && !result.ok);
        verify(!client.busy);
    }
    function test_previousSessionHeartbeatsCannotKeepQuitWaiting() {
        client.operationTimeout = 60;
        ready(true);
        for (let index = 0; index < 5; index++) {
            endpoint.reply({ kind: "heartbeat", id: "previous-session" });
            wait(25);
        }
        verify(!client.busy);
        verify(client._uncertain);
    }
    function test_progressExtendsDeadline() {
        ready();
        client.operationTimeout = 100;
        let result = null;
        client.request("backup", {}, reply => result = reply);
        wait(60);
        endpoint.reply({ kind: "progress", id: endpoint.sent[0].id, phase: "backing-up" });
        wait(60);
        compare(result, null);
        complete(0);
        verify(result.ok);
    }
    function test_reopenedFrontendWaitsForPreviousJob() {
        let result = null;
        client.request("backup", {}, reply => result = reply);
        ready(true);
        compare(endpoint.sent.length, 0);
        endpoint.reply({ kind: "done", id: "previous-session", ok: true });
        compare(endpoint.sent.length, 1);
        complete(0);
        verify(result.ok);
    }
    function test_protocolRejectsMalformedAndOversizedSnapshots() {
        const payload = { date: "2026-09-22", snapshot: [{ name: "a".repeat(61000), polarity: "Positive", isPrivate: false, entries: {} }] };
        let result = null;
        ready();
        client.request("render", payload, reply => result = reply);
        verify(!result.ok);
        compare(endpoint.sent.length, 0);
        compare(ImageProtocol.parseDate("2026-02-30"), null);
        verify(ImageProtocol.validate({ version: 1, id: "id", operation: "render", date: "2026-09-22", snapshot: [{}] }, true) !== "");
        verify(ImageProtocol.validate({ version: 1, id: "id", operation: "developer-restore" }, false) !== "");
    }
    function makeController() {
        ready();
        controller = controllerComponent.createObject(testCase, {
            backend: client, renderAllowed: true, today: new Date(2026, 8, 22),
            habits: Fixtures.fakeModel([Fixtures.habitRow(), Fixtures.habitRow({ name: "Secret", isPrivate: true })])
        });
    }
    function test_controllerCapturesPublicSnapshotAndCoalescesChanges() {
        makeController();
        controller.renderAsync();
        compare(endpoint.sent.length, 1);
        compare(endpoint.sent[0].snapshot.length, 1);
        compare(endpoint.sent[0].date, "2026-09-22");
        controller.habits = Fixtures.fakeModel([Fixtures.habitRow({ name: "Changed" })]);
        controller.renderAsync();
        controller.renderAsync();
        compare(endpoint.sent.length, 1);
        compare(endpoint.sent[0].snapshot[0].name, "Read 20 pages");
        complete(0);
        tryCompare(controller, "phase", "pending");
        controller.renderAsync();
        compare(endpoint.sent.length, 2);
        compare(endpoint.sent[1].snapshot[0].name, "Changed");
        complete(1);
        controller.renderAsync();
        compare(endpoint.sent.length, 2);
    }
    function test_restoreSuppressesPendingAutomaticRender() {
        makeController();
        controller.scheduleRender();
        let restored = null;
        controller.restore(ok => restored = ok);
        compare(endpoint.sent[0].operation, "restore");
        complete(0);
        verify(restored);
        controller.renderAsync();
        compare(endpoint.sent.length, 1);
        compare(controller.phase, "restored");
    }
    function test_leavingCurrentMonthCancelsQueuedSnapshot() {
        makeController();
        controller.renderAsync();
        controller.habits = Fixtures.fakeModel([Fixtures.habitRow({ name: "Changed" })]);
        controller.scheduleRender();
        controller.renderAllowed = false;
        complete(0);
        wait(30);
        controller.renderAsync();
        compare(endpoint.sent.length, 1);
        compare(controller.phase, "saved");
        verify(!controller._renderRequested);
    }
    function test_backupFailureDoesNotReportEnabled() {
        makeController();
        let backedUp = null;
        controller.backup(ok => backedUp = ok);
        complete(0, false);
        compare(backedUp, false);
        compare(controller.phase, "backup-failed");
    }
}
