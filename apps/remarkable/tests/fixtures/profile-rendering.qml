import QtQuick 2.15
import QtTest 1.2
import "src/components" as Components
import "src/testing" as Testing
import "src/js/BuildProfile.js" as BuildProfile

TestCase {
    id: testCase
    name: "ProfileRendering"
    when: windowShown

    Component {
        id: factory
        Components.SuspendCanvas {}
    }

    Component { id: bootFactory; Components.BootCanvas {} }

    Component { id: developerFactory; Testing.DeveloperTools {} }

    function test_developerToolsLoadWithoutRendering() {
        const tools = createTemporaryObject(developerFactory, testCase, {});
        verify(tools !== null);
        compare(tools.canRender, false);
    }

    function test_bootPreviewRefusesOutsideTestInstall() {
        if (!BuildProfile.isTest) return;
        const boot = createTemporaryObject(bootFactory, testCase, {});
        tryVerify(() => boot.available);
        const forbiddenPath = Qt.resolvedUrl("forbidden-boot.bmp").toString().replace("file://", "");
        let result = null;
        boot.renderOnce(forbiddenPath, [], new Date(), ok => result = ok);
        compare(result, false);
    }

    function test_profileTargets() {
        const canvas = createTemporaryObject(factory, testCase, {});
        verify(canvas !== null);
        let selected = false;
        canvas._withTargets(() => selected = true);
        tryVerify(() => selected);
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

        canvas.renderImagesOnce([{ state: "rebooting", path: forbiddenPath }], ok => results.push(ok));
        tryCompare(canvas, "busy", false);
        compare(results, [false, false]);
    }
}
