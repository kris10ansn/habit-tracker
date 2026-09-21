import QtQuick 2.15
import QtTest 1.2
import "../src/testing" as Testing

TestCase {
    id: testCase
    name: "TestSuspendController"
    property var controller: null
    property var requests: []
    property var finishRender: null
    Component { id: factory; Testing.SuspendController {} }
    function init() {
        requests = [];
        finishRender = null;
        controller = createTemporaryObject(factory, testCase, {
            enabled: true, canRender: true,
            renderPreview: function (onDone) { finishRender = onDone; },
            sendRequest: function (operation, payload, onDone) { requests.push({ operation: operation, finish: onDone }); }
        });
    }
    function test_previewNeverPublishes() {
        controller.preview();
        finishRender(true);
        compare(requests.length, 0);
        verify(!controller.busy);
    }
    function test_publishWaitsForPreviewAndUsesExplicitTestOperation() {
        controller.writeOnce();
        compare(requests.length, 0);
        finishRender(true);
        compare(requests[0].operation, "test-write");
        verify(controller.busy);
        requests[0].finish({ ok: true });
        verify(!controller.busy);
    }
    function test_failedPreviewNeverPublishes() {
        controller.writeOnce();
        finishRender(false);
        compare(requests.length, 0);
        verify(!controller.busy);
    }
    function test_disabledAndBusyGuardWrites() {
        controller.enabled = false;
        controller.writeOnce();
        controller.restore();
        compare(finishRender, null);
        compare(requests.length, 0);
        controller.enabled = true;
        controller.writeOnce();
        controller.restore();
        compare(requests.length, 0);
    }
    function test_restoreReportsWorkerFailure() {
        controller.restore();
        compare(requests[0].operation, "test-restore");
        requests[0].finish({ ok: false, error: "Original backup is unreadable" });
        compare(controller.statusText, "Original backup is unreadable");
        verify(!controller.busy);
    }
}
