import QtQuick 2.15
import ".." as App
import "../js/QrCode.js" as QrCodeGenerator

Item {
    id: qrCode

    property string payload: ""
    readonly property var modules: payload ? QrCodeGenerator.encodeAlphanumeric(payload) : []
    readonly property int quietZoneModules: 4
    readonly property int symbolModules: modules.length + quietZoneModules * 2
    readonly property int moduleSize: symbolModules ? Math.floor(Math.min(width, height) / symbolModules) : 0
    readonly property int symbolPixelSize: symbolModules * moduleSize

    onModulesChanged: canvas.requestPaint()
    onModuleSizeChanged: canvas.requestPaint()

    Canvas {
        id: canvas

        anchors.fill: parent
        antialiasing: false
        renderStrategy: Canvas.Immediate
        renderTarget: Canvas.Image

        onPaint: {
            const context = getContext("2d");
            context.reset();
            context.fillStyle = App.Theme.bg;
            context.fillRect(0, 0, width, height);

            if (!qrCode.modules.length || qrCode.moduleSize < 1) {
                return;
            }

            const symbolLeft = Math.floor((width - qrCode.symbolPixelSize) / 2);
            const symbolTop = Math.floor((height - qrCode.symbolPixelSize) / 2);
            const modulesLeft = symbolLeft + qrCode.quietZoneModules * qrCode.moduleSize;
            const modulesTop = symbolTop + qrCode.quietZoneModules * qrCode.moduleSize;

            context.fillStyle = App.Theme.fg;
            qrCode.modules.forEach((row, rowIndex) => {
                row.forEach((dark, columnIndex) => {
                    if (!dark) {
                        return;
                    }

                    context.fillRect(
                        modulesLeft + columnIndex * qrCode.moduleSize,
                        modulesTop + rowIndex * qrCode.moduleSize,
                        qrCode.moduleSize,
                        qrCode.moduleSize
                    );
                });
            });
        }
    }
}
