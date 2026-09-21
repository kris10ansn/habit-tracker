import QtQuick 2.15
import QtTest 1.2
import "src" as App
import "src/js/BuildProfile.js" as BuildProfile

TestCase {
    id: testCase
    name: "ProfileRendering"
    Component { id: factory; App.PowerImageClient {} }
    function test_profileSelectsIsolatedHelper() {
        const client = createTemporaryObject(factory, testCase, {});
        compare(client.endpoint, "http://127.0.0.1:" + (BuildProfile.isTest ? "47832" : "47831"));
        compare(client.tokenPath, BuildProfile.appDirectory + "/power-image-token.json");
    }
}
