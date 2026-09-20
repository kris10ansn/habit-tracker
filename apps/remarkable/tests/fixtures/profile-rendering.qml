import QtQuick 2.15
import QtTest 1.2
import "src/components" as Components
import "src/js/BuildProfile.js" as BuildProfile

TestCase {
    id: testCase
    name: "ProfileRendering"
    when: windowShown

    Component {
        id: factory
        Components.SuspendCanvas {}
    }

    function test_profileTargets() {
        const canvas = createTemporaryObject(factory, testCase, {});
        verify(canvas !== null);
        const paths = canvas.targets.map(target => target.path);
        if (BuildProfile.isTest) {
            compare(paths, [BuildProfile.appDirectory + "/suspend-preview.png"]);
            verify(canvas._backupsReady);
            return;
        }
        compare(paths, ["/usr/share/remarkable/suspended.png", "/usr/share/remarkable/poweroff.png", "/usr/share/remarkable/batteryempty.png"]);
        verify(!canvas._backupsReady);
    }

    function test_testRendererRefusesOutsideAppDirectory() {
        if (!BuildProfile.isTest)
            return;

        const forbiddenPath = Qt.resolvedUrl("forbidden-preview.png").toString().replace("file://", "");
        const canvas = createTemporaryObject(factory, testCase, {
            targetPath: forbiddenPath,
            renderAllowed: true
        });
        verify(canvas !== null);
        tryVerify(() => canvas.available);
        const previousSignature = canvas.lastRenderedSignature;
        canvas.renderAsync();
        tryCompare(canvas, "phase", "save-failed");
        compare(canvas.failedPath, forbiddenPath);
        compare(canvas.lastRenderedSignature, previousSignature);

        const results = [];
        canvas.renderOnce(ok => results.push(ok));
        tryCompare(canvas, "busy", false);
        compare(results, [false]);
    }
}
