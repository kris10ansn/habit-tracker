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
    readonly property bool busy: _requests.length > 0 || _remoteBusy
    property int startupTimeout: 10000
    property int operationTimeout: 120000
    property int maximumOperationDuration: 600000
    property var _requests: []
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
    Timer { id: acknowledgmentDeadline; onTriggered: client.timeOut() }
    Timer { id: progressDeadline; interval: client.operationTimeout; onTriggered: client.timeOut() }
    Timer { id: operationLimit; interval: client.maximumOperationDuration; onTriggered: client.timeOut() }

    function timeOut() {
        _uncertain = _remoteBusy || _requests.some(job => job.sent);
        const unfinished = _requests;
        _requests = [];
        _remoteBusy = false;
        ready = false;
        updateDeadlines();

        const error = _uncertain
            ? "Image helper did not confirm completion. Close and reopen the app before retrying."
            : "Image helper is unavailable. Check the backend installation.";
        failed(error);
        unfinished.forEach(job => job.onDone({ ok: false, error: error }));
    }

    // Every job follows accepted → progress → done. Callers choose which milestone they await;
    // that choice stays local and never changes how the writer receives or runs the request.
    function request(operation, payload, onDone, waitFor = "done") {
        const foregroundPending = _requests.some(job => job.request.operation !== "render");
        if (!enabled || _uncertain || (busy && (!canSubmitWhileBusy(operation) || foregroundPending))) {
            onDone({ ok: false, error: _uncertain ? "Image completion is unknown. Close and reopen the app before retrying." : "Image helper is busy or unavailable" });
            return;
        }

        const message = Object.assign({}, payload, { version: ImageProtocol.version, id: Ids.newId(), operation: operation });
        const body = JSON.stringify(message);
        const invalid = ImageProtocol.validate(message, BuildProfile.isTest);
        if (invalid || unescape(encodeURIComponent(body)).length > 60000) {
            onDone({ ok: false, error: invalid || "Image request is too large" });
            return;
        }

        const replaced = operation === "render"
            ? _requests.filter(job => !job.sent && job.request.operation === "render") : [];
        const job = { request: message, body: body, onDone: onDone, waitFor: waitFor,
            sent: false, accepted: false, acknowledgeBy: Date.now() + startupTimeout };
        _requests = _requests.filter(existing => !replaced.includes(existing)).concat([job]);
        if (!ready) {
            _handshakeAttempts = 0;
        }
        dispatch();
        replaced.forEach(previous => previous.onDone({ ok: false, superseded: true }));
    }

    function canSubmitWhileBusy(operation) {
        return operation === "render" || operation === "finish-background";
    }

    function dispatch() {
        if (ready && endpoint) {
            _requests.forEach(job => {
                if (job.sent || (_remoteBusy && !canSubmitWhileBusy(job.request.operation))) {
                    return;
                }
                job.sent = true;
                job.acknowledgeBy = Date.now() + startupTimeout;
                endpoint.send(job.body);
            });
        }
        updateDeadlines();
    }

    function updateDeadlines(progressMade = false) {
        const awaitingAcceptance = _requests.filter(job => !job.accepted && (job.sent || !ready));
        acknowledgmentDeadline.stop();
        if (awaitingAcceptance.length) {
            const earliest = Math.min.apply(null, awaitingAcceptance.map(job => job.acknowledgeBy));
            acknowledgmentDeadline.interval = Math.max(1, earliest - Date.now());
            acknowledgmentDeadline.start();
        }

        const workOutstanding = _remoteBusy || _requests.some(job => job.sent);
        if (!workOutstanding) {
            progressDeadline.stop();
            operationLimit.stop();
            return;
        }
        if (progressMade || !progressDeadline.running) {
            progressDeadline.restart();
        }
        if (!operationLimit.running) {
            operationLimit.start();
        }
    }

    function dismissBackgroundFailure() {
        if (!backgroundFailure) {
            return;
        }
        endpoint.send(JSON.stringify({ version: ImageProtocol.version, id: Ids.newId(),
            operation: "acknowledge-background", resultId: backgroundFailure.id }));
        backgroundFailure = null;
    }

    function receive(body) {
        let message;
        try { message = JSON.parse(body); } catch (error) { return; }
        if (!message || _uncertain) {
            return;
        }
        if (message.backgroundFailure && message.backgroundFailure.error) {
            backgroundFailure = message.backgroundFailure;
        }
        if (message.kind === "ready") {
            ready = message.version === ImageProtocol.version && message.ready === true;
            if (ready) {
                _remoteBusy = message.busy === true;
                dispatch();
            }
            return;
        }

        const job = _requests.find(candidate => candidate.request.id === message.id);
        if (message.kind === "accepted" && job) {
            job.accepted = true;
            _remoteBusy = message.busy === true;
            updateDeadlines(true);
            if (job.waitFor === "accepted") {
                finish(job, message);
            }
        } else if (message.kind === "progress" && (job || _remoteBusy)) {
            updateDeadlines(true);
            if (job) {
                progress(job.request.operation, message.phase || "", message.message || "", message.imageProgress || null);
            }
        } else if (message.kind === "done" && (job || _remoteBusy)) {
            _remoteBusy = message.busy === true;
            if (job) {
                finish(job, message);
            }
            dispatch();
            updateDeadlines(true);
        }
    }

    function finish(job, result) {
        _requests = _requests.filter(candidate => candidate !== job);
        updateDeadlines();
        job.onDone(result);
    }
}
