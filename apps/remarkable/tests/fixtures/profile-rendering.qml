import QtQuick 2.15
import QtTest 1.2
import "src/components" as Components
import "src/testing" as Testing
import "src/js/BuildProfile.js" as BuildProfile
import "src/js/SuspendRender.js" as SuspendRender

TestCase {
    id: testCase
    name: "ProfileRendering"
    when: windowShown

    Component {
        id: factory
        Components.PowerImageJobs {}
    }

    Component { id: previewFactory; Components.SuspendCanvas {} }
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
        let selected = null;
        SuspendRender.availableImageTargets(canvas.targets, targets => selected = targets);
        tryVerify(() => selected !== null);
        const paths = selected.map(target => target.path);
        if (BuildProfile.isTest) {
            compare(paths, [BuildProfile.appDirectory + "/suspend-preview.png"]);
            return;
        }
        compare(paths, ["/usr/share/remarkable/suspended.png", "/usr/share/remarkable/poweroff.png", "/usr/share/remarkable/batteryempty.png"]);
    }

    function test_testRendererRefusesOutsideAppDirectory() {
        if (!BuildProfile.isTest)
            return;

        const forbiddenPath = Qt.resolvedUrl("forbidden-preview.png").toString().replace("file://", "");
        const canvas = createTemporaryObject(factory, testCase, {
            targetPath: forbiddenPath
        });
        verify(canvas !== null);
        tryVerify(() => canvas.available);
        const previousSignature = canvas.lastRenderedSignature;
        canvas.render([], new Date(), function() {});
        tryCompare(canvas, "phase", "save-failed");
        compare(canvas.failedPath, forbiddenPath);
        compare(canvas.lastRenderedSignature, previousSignature);

        const preview = createTemporaryObject(previewFactory, testCase, { targetPath: forbiddenPath });
        tryVerify(() => preview.available);
        const results = [];
        preview.renderOnce(ok => results.push(ok));
        tryCompare(preview, "busy", false);
        compare(results, [false]);

        preview.renderImagesOnce([{ state: "rebooting", path: forbiddenPath }], ok => results.push(ok));
        tryCompare(preview, "busy", false);
        compare(results, [false, false]);
    }
}
