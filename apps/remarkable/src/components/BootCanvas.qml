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
        renderImages([{ path: path }], snapshot, date, onDone);
    }

    function renderImages(targets, snapshot, date, onDone) {
        if (!targets.length) {
            onDone(true, "");
            return;
        }
        const forbidden = targets.find(target => !BuildProfile.canWrite(target.path));
        if (canvas.busy || !canvas.available || forbidden) {
            onDone(false, forbidden ? forbidden.path : targets[0].path);
            return;
        }
        canvas.busy = true;
        Qt.callLater(() => {
            let buffer;
            try {
                buffer = canvas._render(snapshot, date);
            } catch (error) {
                canvas.busy = false;
                onDone(false, targets[0].path);
                return;
            }
            if (BootSplash.validationError(buffer)) {
                canvas.busy = false;
                onDone(false, targets[0].path);
                return;
            }
            canvas._writeImages(targets, buffer, 0, onDone);
        });
    }

    function _writeImages(targets, buffer, index, onDone) {
        if (index === targets.length) {
            canvas.busy = false;
            onDone(true, "");
            return;
        }
        const path = targets[index].path;
        Storage.writeBinary(path, buffer, error => {
            if (error) {
                canvas.busy = false;
                onDone(false, path);
                return;
            }
            canvas._writeImages(targets, buffer, index + 1, onDone);
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
