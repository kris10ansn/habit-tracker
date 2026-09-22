import QtQuick 2.15
import QtTest 1.2
import "../src/js/BootSplash.js" as BootSplash
import "../src/js/Storage.js" as Storage
import "../src/components" as Components
import "TestPaths.js" as TestPaths

TestCase {
    id: testCase
    name: "BootSplash"
    when: windowShown
    property var encoded: null

    Component { id: factory; Components.BootCanvas {} }

    function initTestCase() {
        const pixels = new Uint8Array(1872 * 1404 * 4);
        pixels.set([0, 0, 0, 255], 0);
        pixels.set([255, 0, 0, 255], (1872 - 1) * 4);
        pixels.set([0, 255, 0, 255], (1404 - 1) * 1872 * 4);
        pixels.set([0, 0, 255, 255], (1872 * 1404 - 1) * 4);
        encoded = BootSplash.encodeLandscape(pixels, 1872, 1404);
    }

    function test_fixedHeaderPaletteAndBottomUpGrayscalePixels() {
        compare(BootSplash.validationError(encoded), "");
        const bytes = new Uint8Array(encoded);
        compare(bytes.length, 2629366);
        for (let shade = 0; shade < 256; shade++)
            compare(Array.from(bytes.slice(54 + shade * 4, 58 + shade * 4)), [shade, shade, shade, 0]);
        compare(bytes[1078], 149);
        compare(bytes[1078 + 1871], 29);
        compare(bytes[1078 + 1403 * 1872], 0);
        compare(bytes[bytes.length - 1], 77);
        compare(bytes[1079], 255);
    }

    function test_rejectsMalformedHeaders_data() {
        return [
            { tag: "signature", offset: 0, value: 0, size: 2 },
            { tag: "length", offset: 2, value: 1, size: 4 },
            { tag: "pixel offset", offset: 10, value: 54, size: 4 },
            { tag: "DIB", offset: 14, value: 108, size: 4 },
            { tag: "width", offset: 18, value: 1404, size: 4 },
            { tag: "top down", offset: 22, value: -1404, size: 4 },
            { tag: "planes", offset: 26, value: 2, size: 2 },
            { tag: "RGB", offset: 28, value: 24, size: 2 },
            { tag: "compressed", offset: 30, value: 1, size: 4 }
        ];
    }

    function test_rejectsMalformedHeaders(data) {
        const buffer = encoded.slice(0);
        const header = new DataView(buffer);
        if (data.size === 2) header.setUint16(data.offset, data.value, true);
        else header.setUint32(data.offset, data.value, true);
        verify(BootSplash.validationError(buffer) !== "");
    }

    function test_rejectsMissingAndTruncatedPixels() {
        verify(BootSplash.validationError(null) !== "");
        verify(BootSplash.validationError(encoded.slice(0, -1)) !== "");
        let threw = false;
        try { BootSplash.encodeLandscape(new Uint8Array(4), 1404, 1872); }
        catch (error) { threw = true; }
        verify(threw);
    }

    function test_realCanvasSavesBootFormatAndRecoversFromRenderFailure() {
        const canvas = createTemporaryObject(factory, testCase, {});
        tryVerify(() => canvas.available);
        const path = TestPaths.tmpPath("rendered-boot.bmp");
        const snapshot = [{ name: "Read", entries: {}, polarity: "positive", isPrivate: false }];
        let result = null;
        canvas.renderOnce(path, snapshot, new Date(2026, 8, 21), ok => result = ok);
        tryVerify(() => result !== null, 10000);
        compare(result, true);
        const expected = new Uint8Array(Storage.readBinary(path));
        result = null;
        canvas.renderOnce(path, null, new Date(2026, 8, 21), ok => result = ok);
        tryVerify(() => result !== null);
        compare(result, false);
        verify(!canvas.busy);
        result = null;
        canvas.renderOnce(path, snapshot, new Date(2026, 8, 21), ok => result = ok);
        tryVerify(() => result !== null, 10000);
        compare(result, true);
        compare(BootSplash.validationError(Storage.readBinary(path)), "");
        verify(new Uint8Array(Storage.readBinary(path)).every((value, index) => value === expected[index]));
        const pixels = new Uint8Array(Storage.readBinary(path)).slice(1078);
        verify(pixels.some(pixel => pixel < 20));
        verify(pixels.some(pixel => pixel === 255));
    }
}
