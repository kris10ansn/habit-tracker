import QtQuick 2.15
import QtTest 1.2
import "../src/components" as Components
import "../src/js/QrCode.js" as QrCode

TestCase {
    name: "QrCode"

    Components.QrCode {
        id: renderedQrCode

        width: 296
        height: 296
        payload: "HABITTRACKER:1:ABC234"
    }

    function test_encodesTheVersionedPairingPayloadAsVersionTwo() {
        const modules = QrCode.encodeAlphanumeric("HABITTRACKER:1:ABC234");

        compare(modules.length, 25);
        modules.forEach(row => compare(row.length, 25));
        verify(modules.every(row => row.every(module => typeof module === "boolean")));
    }

    function test_drawsTheThreeFinderPatterns() {
        const modules = QrCode.encodeAlphanumeric("HABITTRACKER:1:ABC234");

        _verifyFinderPattern(modules, 0, 0);
        _verifyFinderPattern(modules, 0, 18);
        _verifyFinderPattern(modules, 18, 0);
    }

    function test_rendererUsesCrispIntegerModulesAndAFourModuleQuietZone() {
        compare(renderedQrCode.modules.length, 25);
        compare(renderedQrCode.moduleSize, 8);
        compare(renderedQrCode.symbolModules, 33);
        compare(renderedQrCode.symbolPixelSize, 264);
    }

    function test_isDeterministicAndSensitiveToThePairingCode() {
        const first = QrCode.encodeAlphanumeric("HABITTRACKER:1:ABC234");
        const repeated = QrCode.encodeAlphanumeric("HABITTRACKER:1:ABC234");
        const different = QrCode.encodeAlphanumeric("HABITTRACKER:1:XYZ789");

        compare(_rows(first), _rows(repeated));
        verify(_rows(first) !== _rows(different));
    }

    function test_rejectsUnsupportedOrOversizedText() {
        _verifyThrows(() => QrCode.encodeAlphanumeric(""));
        _verifyThrows(() => QrCode.encodeAlphanumeric("lowercase"));
        _verifyThrows(() => QrCode.encodeAlphanumeric("A".repeat(39)));
    }

    function _verifyFinderPattern(modules, top, left) {
        const expectedRows = [
            "1111111",
            "1000001",
            "1011101",
            "1011101",
            "1011101",
            "1000001",
            "1111111",
        ];
        expectedRows.forEach((expectedRow, rowOffset) => {
            const actualRow = modules[top + rowOffset]
                .slice(left, left + 7)
                .map(module => module ? "1" : "0")
                .join("");
            compare(actualRow, expectedRow);
        });
    }

    function _rows(modules) {
        return modules.map(row => row.map(module => module ? "1" : "0").join("")).join("\n");
    }

    function _verifyThrows(operation) {
        let thrown = false;
        try {
            operation();
        } catch (error) {
            thrown = true;
        }

        verify(thrown);
    }
}
