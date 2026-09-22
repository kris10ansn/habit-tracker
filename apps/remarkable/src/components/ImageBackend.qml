import QtQuick 2.15
import "../js/BuildProfile.js" as BuildProfile
import "../js/Ids.js" as Ids
import "../js/ImageProtocol.js" as ImageProtocol

Item {
    id: client
    property bool enabled: true
    property var transport: null
    readonly property var endpoint: transport || connection.item
    property bool ready: false
    readonly property bool busy: _pending !== null || _remoteBusy
    property int startupTimeout: 10000
    property int operationTimeout: 120000
    property int maximumOperationDuration: 600000
    property var _pending: null
    property var _handoff: null
    property bool _remoteBusy: false
    property bool _uncertain: false
    property int _handshakeAttempts: 0
    signal failed(string message)
    signal progress(string operation, string phase, string message)

    Loader { id: connection; active: client.enabled && !client.transport; source: "AppLoadTransport.qml" }
    Connections {
        target: client.endpoint
        function onMessage(body) { client.receive(body); }
    }
    Timer {
        interval: 500
        repeat: true
        triggeredOnStart: true
        running: client.enabled && !!client.endpoint && !client.ready && !client._uncertain && client._handshakeAttempts < 20
        onTriggered: {
            client._handshakeAttempts++;
            client.endpoint.send(JSON.stringify({ operation: "hello", version: ImageProtocol.version }));
        }
    }
    Timer {
        id: deadline
        onTriggered: client.timeOut()
    }
    Timer {
        id: operationLimit
        interval: client.maximumOperationDuration
        onTriggered: client.timeOut()
    }
    Timer {
        id: handoffDeadline
        interval: client.operationTimeout
        onTriggered: {
            client._uncertain = client._uncertain || client._handoff.sent;
            client.finishHandoff({ ok: false, error: "Image helper did not accept the final snapshot. Keep the app open or reopen it before retrying." });
        }
    }

    function timeOut() {
        deadline.stop();
        operationLimit.stop();
        _uncertain = (!!_pending && _pending.sent) || _remoteBusy;
        _remoteBusy = false;
        ready = false;
        const error = _uncertain
            ? "Image helper did not confirm completion. Close and reopen the app before retrying."
            : "Image helper is unavailable. Check the backend installation.";
        failed(error);
        finish({ ok: false, error: error });
        finishHandoff({ ok: false, error: error });
    }

    function request(operation, payload, onDone) {
        if (!enabled || _uncertain || _pending || _remoteBusy || _handoff) {
            onDone({ ok: false, error: _uncertain ? "Image completion is unknown. Close and reopen the app before retrying." : "Image helper is busy or unavailable" });
            return;
        }
        const job = Object.assign({}, payload, { version: ImageProtocol.version, id: Ids.newId(), operation: operation });
        const body = JSON.stringify(job);
        const invalid = ImageProtocol.validate(job, BuildProfile.isTest);
        if (invalid || unescape(encodeURIComponent(body)).length > 60000) {
            onDone({ ok: false, error: invalid || "Image snapshot is too large" });
            return;
        }
        if (!ready) _handshakeAttempts = 0;
        _pending = { request: job, body: body, onDone: onDone, sent: false };
        deadline.interval = ready ? operationTimeout : startupTimeout;
        deadline.restart();
        dispatch();
    }
    function dispatch() {
        if (!ready || !endpoint) return;
        if (_handoff && !_handoff.sent) {
            _handoff.sent = true;
            endpoint.send(_handoff.body);
        }
        if (_remoteBusy || !_pending || _pending.sent || _handoff) return;
        _pending.sent = true;
        deadline.interval = operationTimeout;
        deadline.restart();
        operationLimit.restart();
        endpoint.send(_pending.body);
    }
    function handoff(payload, onDone) {
        if (!enabled || _uncertain || _handoff || (_pending && _pending.request.operation !== "render")) {
            onDone({ ok: false, error: "Image helper is busy or unavailable" });
            return;
        }
        const job = Object.assign({}, payload, { version: ImageProtocol.version, id: Ids.newId(), operation: "handoff" });
        const body = JSON.stringify(job);
        const invalid = ImageProtocol.validate(job, BuildProfile.isTest);
        if (invalid || unescape(encodeURIComponent(body)).length > 60000) {
            onDone({ ok: false, error: invalid || "Image snapshot is too large" });
            return;
        }
        _handoff = { id: job.id, body: body, onDone: onDone, sent: false };
        if (!ready) _handshakeAttempts = 0;
        handoffDeadline.interval = ready ? operationTimeout : startupTimeout;
        handoffDeadline.restart();
        dispatch();
    }
    function finishHandoff(result) {
        if (!_handoff) return;
        handoffDeadline.stop();
        const onDone = _handoff.onDone;
        _handoff = null;
        onDone(result);
    }
    function receive(body) {
        let message;
        try { message = JSON.parse(body); } catch (error) { return; }
        if (!message || _uncertain) return;
        if (_handoff && message.id === _handoff.id) {
            if (message.kind === "accepted") {
                deadline.stop();
                operationLimit.stop();
                _pending = null;
                _remoteBusy = true;
                finishHandoff({ ok: true });
                return;
            }
            if (message.kind === "done") {
                finishHandoff(message);
                return;
            }
        }
        if (message.kind === "ready") {
            ready = message.version === ImageProtocol.version && message.ready === true;
            _remoteBusy = message.busy === true;
            if (_remoteBusy) {
                if (!operationLimit.running) operationLimit.start();
                deadline.interval = operationTimeout;
                deadline.restart();
            }
            if (ready) dispatch();
            return;
        }
        if (message.kind === "done" && (!_pending || message.id !== _pending.request.id)) {
            if (!_remoteBusy || (_pending && _pending.sent)) return;
            if (message.busy === true) return;
            _remoteBusy = false;
            deadline.stop();
            operationLimit.stop();
            dispatch();
            return;
        }
        if (_remoteBusy && message.kind === "progress") deadline.restart();
        if (!_pending || message.id !== _pending.request.id) return;
        if (message.kind === "progress") {
            deadline.restart();
            progress(_pending.request.operation, message.phase || "", message.message || "");
        } else if (message.kind === "done") {
            finish(message);
        }
    }
    function finish(result) {
        if (!_pending) return;
        deadline.stop();
        operationLimit.stop();
        _remoteBusy = result.busy === true;
        const onDone = _pending.onDone;
        _pending = null;
        onDone(result);
    }
}
