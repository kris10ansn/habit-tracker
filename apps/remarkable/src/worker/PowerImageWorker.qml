import QtQuick 2.15
import "../components" as App
import "../js/BuildProfile.js" as BuildProfile
import "../js/ImageProtocol.js" as ImageProtocol

Item {
    id: worker
    property var activeRequest: null
    readonly property bool ready: writer.available && (!BuildProfile.isTest || (developer.item && developer.item.ready))
    App.SuspendCanvas { id: writer }
    Loader {
        id: developer
        source: BuildProfile.isTest ? "../testing/DeveloperImageJobs.qml" : ""
    }
    Connections {
        target: ImageBridge
        function onMessage(body) { worker.receive(body); }
    }
    Connections {
        target: writer
        function onPhaseChanged() { Qt.callLater(worker.report); }
        function onBusyChanged() { Qt.callLater(worker.report); }
    }
    Connections {
        target: developer.item
        ignoreUnknownSignals: true
        function onStatusTextChanged() { worker.progress(developer.item.statusText); }
    }

    Timer { interval: 1000; repeat: true; running: worker.activeRequest !== null; onTriggered: worker.progress("") }

    function send(message) { ImageBridge.reply(JSON.stringify(message)); }
    function receive(body) {
        let request;
        try { request = JSON.parse(body); } catch (error) { return; }
        if (!request || typeof request !== "object" || Array.isArray(request)) return;
        if (request.operation === "hello") {
            send({ version: ImageProtocol.version, kind: "ready", ready: worker.ready, busy: activeRequest !== null });
            return;
        }
        const invalid = ImageProtocol.validate(request, BuildProfile.isTest);
        if (invalid || !worker.ready || activeRequest || !ImageBridge.acquire()) {
            send({ kind: "done", id: request.id, ok: false, error: invalid || "Image helper is busy or not ready" });
            return;
        }
        activeRequest = request;
        if (request.operation === "backup") {
            writer.backup(ok => {
                if (ok) writer.restorationPending = false;
                worker.finish(ok, writer.failedPath);
            });
        } else if (request.operation === "restore") {
            writer.restore(ok => worker.finish(ok, writer.failedPath));
        } else if (request.operation === "render") {
            // Each frontend session refreshes images that another app may have replaced.
            writer._renderedThisSession = false;
            writer.suppliedSnapshot = request.snapshot;
            writer.today = ImageProtocol.parseDate(request.date);
            writer.renderAllowed = true;
            writer.renderAsync();
            Qt.callLater(worker.report);
        } else {
            developer.item.snapshot = request.snapshot || [];
            developer.item.today = ImageProtocol.parseDate(request.date) || new Date();
            developer.item.execute(request.operation, (ok, message) => worker.finish(ok, "", message));
        }
    }
    function progress(message) {
        if (activeRequest) send({ kind: "progress", id: activeRequest.id, phase: writer.phase, message: message || "" });
    }
    function report() {
        if (!activeRequest || activeRequest.operation !== "render") return;
        progress("");
        if (writer.busy || writer.phase === "saving" || writer.phase === "pending") return;
        finish(writer.phase === "saved", writer.failedPath);
    }
    function finish(ok, path, message = "") {
        if (!activeRequest) return;
        const id = activeRequest.id;
        writer.renderAllowed = false;
        activeRequest = null;
        send({ kind: "done", id: id, ok: ok, path: path, message: message, error: ok ? "" : (message || path || "Image operation failed") });
        ImageBridge.release();
    }
}
