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
    readonly property bool busy: _pending !== null || _handoff !== null || _remoteBusy
    property int startupTimeout: 10000
    property int operationTimeout: 120000
    property int maximumOperationDuration: 600000
    property var _pending: null
    property var _handoff: null
    property var backgroundFailure: null
    property bool _remoteBusy: false
    property bool _uncertain: false
    property int _handshakeAttempts: 0
    signal failed(string message)
    signal progress(string operation, string phase, string message, var imageProgress)

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
        interval: client.startupTimeout
        onTriggered: {
            client._uncertain = !!client._handoff && client._handoff.sent;
            client.finishHandoff({ ok: false, error: "The image writer did not acknowledge the background save. The app is still open." });
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
    }

    function request(operation, payload, onDone) {
        if (!enabled || _uncertain || _pending || _handoff || _remoteBusy) {
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
        if (_remoteBusy || !_pending || _pending.sent) return;
        _pending.sent = true;
        deadline.interval = operationTimeout;
        deadline.restart();
        operationLimit.restart();
        endpoint.send(_pending.body);
    }
    function handoff(operation, payload, onDone) {
        if (!enabled || _uncertain || _handoff || (_pending && _pending.request.operation !== "render")) {
            onDone({ ok: false, error: "The image writer is unavailable for background saving" });
            return;
        }

        const job = Object.assign({}, payload, { version: ImageProtocol.version, id: Ids.newId(), operation: operation });
        const invalid = ImageProtocol.validate(job, BuildProfile.isTest);
        if (invalid) {
            onDone({ ok: false, error: invalid });
            return;
        }

        // A not-yet-sent render is replaced by the confirmed snapshot handed over at Quit.
        if (_pending && !_pending.sent) finish({ ok: false, superseded: true });
        _handoff = { request: job, body: JSON.stringify(job), onDone: onDone, sent: false };
        if (!ready) _handshakeAttempts = 0;
        handoffDeadline.restart();
        dispatch();
    }

    function finishHandoff(result) {
        if (!_handoff) return;
        handoffDeadline.stop();
        const callback = _handoff.onDone;
        _handoff = null;
        callback(result);
    }

    function dismissBackgroundFailure() {
        if (!backgroundFailure) return;
        endpoint.send(JSON.stringify({ version: ImageProtocol.version, id: Ids.newId(),
            operation: "acknowledge-background", resultId: backgroundFailure.id }));
        backgroundFailure = null;
    }

    function receive(body) {
        let message;
        try { message = JSON.parse(body); } catch (error) { return; }
        if (!message || _uncertain) return;
        if (message.backgroundFailure && message.backgroundFailure.error) {
            backgroundFailure = message.backgroundFailure;
        }
        if (_handoff && message.id === _handoff.request.id && (message.kind === "accepted" || message.kind === "done")) {
            _remoteBusy = message.busy === true;
            finishHandoff(message);
            return;
        }
        if (message.kind === "ready") {
            ready = message.version === ImageProtocol.version && message.ready === true;
            _remoteBusy = message.busy === true;
            if (_remoteBusy) {
                if (!operationLimit.running) operationLimit.start();
                deadline.interval = operationTimeout;
                deadline.restart();
            }
            dispatch();
            return;
        }
        if (message.kind === "done" && (!_pending || message.id !== _pending.request.id)) {
            if (!_remoteBusy || (_pending && _pending.sent)) return;
            _remoteBusy = message.busy === true;
            if (_remoteBusy) {
                deadline.restart();
                return;
            }
            deadline.stop();
            operationLimit.stop();
            dispatch();
            return;
        }
        if (_remoteBusy && message.kind === "progress") deadline.restart();
        if (!_pending || message.id !== _pending.request.id) return;
        if (message.kind === "progress") {
            deadline.restart();
            progress(_pending.request.operation, message.phase || "", message.message || "", message.imageProgress || null);
        } else if (message.kind === "done") {
            finish(message);
        }
    }
    function finish(result) {
        if (!_pending) return;
        deadline.stop();
        operationLimit.stop();
        _remoteBusy = result.busy === true;
        if (_remoteBusy) {
            deadline.interval = operationTimeout;
            deadline.restart();
            operationLimit.restart();
        }
        const onDone = _pending.onDone;
        _pending = null;
        onDone(result);
    }
}
