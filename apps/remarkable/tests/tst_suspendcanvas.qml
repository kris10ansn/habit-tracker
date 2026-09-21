import QtQuick 2.15
import QtTest 1.2
import "../src/components" as App
import "../src/js/Storage.js" as Storage
import "Fixtures.js" as Fixtures
import "TestPaths.js" as TestPaths

TestCase {
    id: testCase
    name: "SuspendCanvas"
    when: windowShown

    Component {
        id: factory
        App.SuspendCanvas {}
    }

    function createCanvas(output) {
        const canvas = createTemporaryObject(factory, testCase, {
            targetPath: TestPaths.tmpPath(output),
            signaturePath: TestPaths.tmpPath("canvas-signature.json"),
            habits: Fixtures.fakeModel([Fixtures.habitRow()]),
            today: new Date(2026, 7, 17)
        });
        verify(canvas !== null);
        tryVerify(() => canvas.available);
        return canvas;
    }

    function test_oneShotSavesBeforeCallbackAndRerendersUnchangedHabits() {
        const canvas = createCanvas("canvas-preview.png");
        const results = [];
        canvas.renderOnce(ok => results.push(ok));
        tryVerify(() => results.length === 1);
        compare(results[0], true);
        const image = new Uint8Array(Storage.readBinary(canvas.targetPath));
        compare(Array.from(image.slice(0, 4)), [137, 80, 78, 71]);

        canvas.renderOnce(ok => results.push(ok));
        tryVerify(() => results.length === 2);
        compare(results[1], true);
    }

    function test_oneShotReportsSaveFailure() {
        const canvas = createCanvas("missing-canvas-directory/preview.png");
        const results = [];
        canvas.renderOnce(ok => results.push(ok));
        tryVerify(() => results.length === 1);
        compare(results[0], false);
    }

    function test_batchUsesOneSnapshotAndReportsFailedPath() {
        const canvas = createCanvas("batch-preview.png");
        const baseline = ["sleep", "off"].map(state => ({ state: state, path: TestPaths.tmpPath("baseline-" + state + ".png") }));
        let baselineSaved = false;
        canvas.renderImagesOnce(baseline, ok => baselineSaved = ok);
        tryVerify(() => baselineSaved);

        const targets = ["sleep", "off", "empty", "starting"].map(state => ({ state: state, path: TestPaths.tmpPath("batch-" + state + ".png") }));
        targets[2].path = TestPaths.tmpPath("absent-directory/empty.png");
        let result = null;
        canvas.renderImagesOnce(targets, (ok, path) => result = { ok: ok, path: path });
        canvas.today = new Date(2027, 0, 1);
        canvas.habits = Fixtures.fakeModel([Fixtures.habitRow({ name: "Changed after capture" })]);
        tryVerify(() => result !== null);
        compare(result.ok, false);
        compare(result.path, targets[2].path);
        baseline.forEach((target, index) => compare(
            Array.from(new Uint8Array(Storage.readBinary(targets[index].path))).join(","),
            Array.from(new Uint8Array(Storage.readBinary(target.path))).join(",")
        ));
        compare(Storage.readBinary(targets[3].path), null);
    }
}
