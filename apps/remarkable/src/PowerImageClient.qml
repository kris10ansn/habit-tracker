import QtQuick 2.15
import "js/BuildProfile.js" as BuildProfile
import "js/Storage.js" as Storage

QtObject {
    id: client
    property string endpoint: BuildProfile.powerImageEndpoint
    property string tokenPath: BuildProfile.appDirectory + "/power-image-token.json"
    property var _requests: []
    property bool _alive: true
    property Timer _poll: Timer {
        interval: 100
        repeat: true
        running: client._requests.length > 0
        onTriggered: client._tick()
    }
    Component.onDestruction: {
        _alive = false;
        _requests.forEach(request => { if (request.xhr) request.xhr.abort(); });
    }

    function request(operation, payload, onDone, onAccepted) {
        const job = { operation: operation, payload: payload, onDone: onDone,
            onAccepted: onAccepted, deadline: Date.now() + 5000, jobId: "", xhr: null, token: "" };
        client._requests = client._requests.concat([job]);
        Storage.readJson(client.tokenPath, token => {
            if (!client || !client._alive || client._requests.indexOf(job) < 0) return;
            if (typeof token !== "string" || Storage.isMissing(token) || Storage.isCorrupt(token)) {
                client._finish(job, { ok: false, error: "Power-image helper unavailable" });
                return;
            }
            job.token = token;
            client._send(job, operation, payload);
        });
    }

    function _send(job, operation, payload) {
        const xhr = new XMLHttpRequest();
        job.xhr = xhr;
        xhr.onreadystatechange = () => {
            if (!client || !client._alive || xhr.readyState !== XMLHttpRequest.DONE || job.xhr !== xhr) return;
            job.xhr = null;
            let result;
            try { result = JSON.parse(xhr.responseText); }
            catch (error) { result = { ok: false, error: "Power-image helper unavailable" }; }
            if (!result || typeof result !== "object") result = { ok: false, error: "Invalid helper response" };
            if (xhr.status !== 200) result = { ok: false, error: result.error || "Power-image helper unavailable" };
            if (result.accepted) {
                job.jobId = result.jobId;
                job.deadline = Date.now() + 150000;
                if (job.onAccepted) job.onAccepted();
                return;
            }
            if (!result.pending) client._finish(job, result);
        };
        try {
            xhr.open("POST", client.endpoint + "/" + operation, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("Authorization", "Bearer " + job.token);
            xhr.send(JSON.stringify(payload));
        } catch (error) {
            job.xhr = null;
            client._finish(job, { ok: false, error: "Power-image helper unavailable" });
        }
    }

    function _tick() {
        client._requests.slice().forEach(job => {
            if (Date.now() >= job.deadline) {
                const xhr = job.xhr;
                job.xhr = null;
                if (xhr) xhr.abort();
                client._finish(job, { ok: false, error: "Power-image helper timed out" });
                return;
            }
            if (job.jobId && !job.xhr) client._send(job, "status", { jobId: job.jobId });
        });
    }

    function _finish(job, result) {
        if (client._requests.indexOf(job) < 0) return;
        client._requests = client._requests.filter(request => request !== job);
        job.onDone(result);
    }
}
