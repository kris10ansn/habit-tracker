import QtQuick 2.15
import QtTest 1.2
import "../src/js/SuspendDraw.js" as SuspendDraw

TestCase {
    name: "SleepIcon"
    when: windowShown

    Canvas {
        id: canvas
        width: 70
        height: 70

        onPaint: {
            const context = getContext("2d");
            context.reset();
            // Crop the actual suspend renderer to the moon, undoing its portrait rotation.
            context.translate(-110, -1135);
            context.translate(0, 1404);
            context.rotate(-Math.PI / 2);
            SuspendDraw.draw(context, 1404, 1872, [], new Date(2026, 7, 9),
                { fg: "#111111", bg: "#ffffff" }, "sleep");
        }
    }

    SignalSpy { id: paintedSpy; target: canvas; signalName: "painted" }

    function test_noStrokeExtendsAboveAndRightOfTheCrescentTip() {
        tryVerify(() => paintedSpy.count > 0);
        const context = canvas.getContext("2d");
        const crescent = context.getImageData(10, 25, 10, 20).data;
        verify(Array.from(crescent).some((value, index) => index % 4 === 0 && value < 100),
            "The crescent must be drawn");

        const aboveTip = context.getImageData(28, 15, 11, 5).data;
        Array.from(aboveTip).forEach((value, index) => {
            compare(value, 255, "Unexpected stroke above the crescent at channel " + index);
        });
    }
}
