import QtQuick 2.15
import "../components" as App
import "../js/BuildProfile.js" as BuildProfile
import "../js/ImageProtocol.js" as ImageProtocol

Item {
    id: worker
    property var activeRequest: null
    readonly property bool ready: writer.available && (!BuildProfile.isTest || (developer.item && developer.item.ready))
    ImageEnvironment { id: environment; configuration: ImageWorkerConfiguration }
    App.PowerImageJobs {
        id: writer
        imageDirectory: environment.imageDirectory
        bootImageDirectory: environment.bootImageDirectory
        bootBackupDirectory: environment.appDirectory
        deviceModel: environment.deviceModel
        signaturePath: environment.appDirectory + "/.sleep-sig"
        targetPath: environment.suspendPath
        backupPath: environment.suspendBackupPath
        onProgress: function(phase, path) { worker.progress(path); }
    }
    Loader { id: developer }
    Component.onCompleted: {
        BuildProfile.configureImageWorker(environment.appDirectory);
        if (BuildProfile.isTest)
            developer.setSource("../testing/DeveloperImageJobs.qml", { environment: environment });
    }
    Connections {
        target: ImageBridge
        function onMessage(body) { worker.receive(body); }
    }
    Connections {
        target: developer.item
        ignoreUnknownSignals: true
        function onStatusTextChanged() { worker.progress(developer.item.statusText); }
    }

    Timer { interval: 1000; repeat: true; running: worker.activeRequest !== null; onTriggered: worker.send({ kind: "heartbeat", id: worker.activeRequest.id }) }

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
            writer.backup((ok, path) => worker.finish(ok, path));
        } else if (request.operation === "restore") {
            writer.restore((ok, path) => worker.finish(ok, path));
        } else if (request.operation === "render") {
            writer.render(request.snapshot, ImageProtocol.parseDate(request.date), (ok, path) => worker.finish(ok, path));
        } else {
            developer.item.snapshot = request.snapshot || [];
            developer.item.today = ImageProtocol.parseDate(request.date) || new Date();
            developer.item.execute(request.operation, (ok, message) => worker.finish(ok, "", message));
        }
    }
    function progress(message) {
        if (activeRequest) send({ kind: "progress", id: activeRequest.id, phase: writer.phase, message: message || "" });
    }
    function finish(ok, path, message = "") {
        if (!activeRequest) return;
        const id = activeRequest.id;
        activeRequest = null;
        send({ kind: "done", id: id, ok: ok, path: path, message: message, error: ok ? "" : (message || path || "Image operation failed") });
        ImageBridge.release();
    }
}
