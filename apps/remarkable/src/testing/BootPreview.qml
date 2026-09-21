import QtQuick 2.15
import "../js/SuspendDraw.js" as SuspendDraw
import "../js/BootSplash.js" as BootSplash
import "../js/Storage.js" as Storage
import "../js/BuildProfile.js" as BuildProfile

Canvas {
    id: canvas
    width: 1872
    height: 1404
    x: -2000
    visible: true
    renderStrategy: Canvas.Cooperative
    renderTarget: Canvas.Image
    property bool busy: false

    function renderOnce(path, snapshot, date, onDone) {
        if (canvas.busy || !canvas.available || !BuildProfile.canWrite(path)) {
            onDone(false, path);
            return;
        }
        canvas.busy = true;
        Qt.callLater(() => {
            let buffer;
            try {
                buffer = canvas._render(snapshot, date);
            } catch (error) {
                canvas.busy = false;
                onDone(false, path);
                return;
            }
            Storage.writeBinary(path, buffer, error => {
                canvas.busy = false;
                onDone(!error, error ? path : "");
            });
        });
    }

    function _render(snapshot, date) {
        const context = canvas.getContext("2d");
        context.reset();
        context.save();
        try {
            // The stock RM1 BMP stores the portrait image rotated clockwise.
            context.translate(canvas.width, 0);
            context.rotate(Math.PI / 2);
            SuspendDraw.draw(context, 1404, 1872, snapshot, date, { fg: "#000000", bg: "#ffffff" }, "starting");
        } finally {
            context.restore();
        }
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        return BootSplash.encodeLandscape(pixels, canvas.width, canvas.height);
    }
}
