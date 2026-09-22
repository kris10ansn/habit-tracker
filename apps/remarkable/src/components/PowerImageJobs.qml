import QtQuick 2.15
import "../js/SuspendRender.js" as SuspendRender
import "../js/SuspendDraw.js" as SuspendDraw
import "../js/BootSplash.js" as BootSplash
import "../js/BuildProfile.js" as BuildProfile
import "../js/Storage.js" as Storage

Item {
    id: jobs
    property string imageDirectory: "/usr/share/remarkable"
    property string bootImageDirectory: "/var/lib/uboot"
    property string bootBackupDirectory: BuildProfile.appDirectory
    property string deviceModel: BuildProfile.isTest ? "" : Storage.readFile("/sys/devices/soc0/machine").trim()
    property string targetPath: BuildProfile.suspendPath
    property string backupPath: BuildProfile.suspendBackupPath
    property string signaturePath: BuildProfile.signaturePath
    property var targets: BuildProfile.isTest
        ? [{ state: "sleep", path: targetPath, backup: backupPath }]
        : SuspendRender.imageTargets(imageDirectory)
            .concat(BootSplash.imageTargets(bootBackupDirectory, imageDirectory, bootImageDirectory))
    readonly property bool available: png.available && boot.available
    readonly property bool busy: _completion !== null
    property string phase: ""
    property string failedPath: ""
    property string lastRenderedSignature: ""
    property bool restorationPending: false
    property var _completion: null
    property var _selectedTargets: null
    property bool _backupsReady: BuildProfile.isTest

    signal progress(string phase, string path)

    SuspendCanvas {
        id: png
        onImageSaved: function(path) { jobs.progress("saving", path); }
    }
    BootCanvas { id: boot }

    function _begin(phase, onDone) {
        if (busy || !available) {
            onDone(false, "Image execution is busy or not ready");
            return false;
        }
        _completion = onDone;
        failedPath = "";
        _progress(phase, "");
        return true;
    }
    function _progress(phase, path) {
        jobs.phase = phase;
        jobs.progress(phase, path);
    }
    function _finish(ok, path, successPhase, failurePhase) {
        if (!_completion) return;

        const onDone = _completion;
        failedPath = ok ? "" : path;
        phase = ok ? successPhase : failurePhase;
        _completion = null;
        onDone(ok, failedPath);
    }
    function _withTargets(onDone) {
        if (_selectedTargets) { onDone(_selectedTargets); return; }

        SuspendRender.availableImageTargets(targets, selected => {
            _selectedTargets = selected;
            onDone(selected);
        });
    }
    function _prepare(onDone) {
        _withTargets(selected => SuspendRender.backupImages(selected, (ok, path) => {
            _backupsReady = ok;
            onDone(ok, path);
        }, deviceModel));
    }
    function backup(onDone) {
        if (!_begin("backing-up", onDone)) return;

        _prepare((ok, path) => {
            if (ok) restorationPending = false;
            _finish(ok, path, "backed-up", "backup-failed");
        });
    }
    function restore(onDone) {
        if (!_begin("restoring", onDone)) return;

        restorationPending = true;
        _backupsReady = false;
        _withTargets(selected => SuspendRender.restoreImages(selected, (ok, path) => {
            if (!ok) { _finish(false, path, "restored", "restore-failed"); return; }

            SuspendRender.writeSignature(signaturePath, "", saved => {
                if (saved) lastRenderedSignature = "";
                _finish(saved, signaturePath, "restored", "restore-failed");
            });
        }, deviceModel));
    }
    function render(snapshot, date, onDone) {
        if (restorationPending) {
            onDone(false, "Restore must finish and writing must be re-enabled before rendering");
            return;
        }
        if (!_begin(_backupsReady ? "saving" : "backing-up", onDone)) return;

        const captured = JSON.parse(JSON.stringify(snapshot));
        const capturedDate = new Date(date.getTime());
        if (_backupsReady) {
            _withTargets(selected => _renderCaptured(selected, captured, capturedDate));
            return;
        }
        _prepare((ok, path) => {
            if (!ok) _finish(false, path, "saved", "backup-failed");
            else _renderCaptured(_selectedTargets, captured, capturedDate);
        });
    }
    function _renderCaptured(selected, snapshot, date) {
        _progress("saving", "");
        SuspendRender.invalidBootPath(selected, deviceModel, invalid => {
            if (invalid) { _finish(false, invalid, "saved", "save-failed"); return; }

            _renderPngs(selected, snapshot, date);
        });
    }
    function _renderPngs(selected, snapshot, date) {
        png.renderImagesOnce(selected.filter(target => target.format !== "boot-bmp"), (ok, path) => {
            if (!ok) { _finish(false, path, "saved", "save-failed"); return; }

            _renderBoot(selected, snapshot, date);
        }, snapshot, date);
    }
    function _renderBoot(selected, snapshot, date) {
        const bootTargets = selected.filter(target => target.format === "boot-bmp");
        boot.renderImages(bootTargets, snapshot, date, (ok, path) => {
            if (!ok) { _finish(false, path, "saved", "save-failed"); return; }

            _progress("saving", signaturePath);
            const signature = SuspendDraw.computeSignature(snapshot, date) + "\n" + selected.map(target => target.path).join("\n");
            SuspendRender.writeSignature(signaturePath, signature, saved => {
                if (saved) lastRenderedSignature = signature;
                _finish(saved, signaturePath, "saved", "save-failed");
            });
        });
    }
}
