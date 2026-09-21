#include "PowerImageService.h"
#include "Renderer.h"
#include <QDebug>
#include <QFile>
#include <QGuiApplication>
#include <QTextStream>
#ifndef JS_DIR
#define JS_DIR "."
#endif
static QString readFile(const QString &path) {
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly))
        return QString();
    return QString::fromUtf8(file.readAll());
}
int main(int argc, char *argv[]) {
    qputenv("QT_QPA_PLATFORM", "offscreen");
    QGuiApplication app(argc, argv);

    if (app.arguments().contains("--serve") || app.arguments().contains("--worker"))
        return runPowerImageService(app);

    QString rosterPath, monthPath, todayArg;
    QString powerState = "sleep";
    QString outPath = "suspended.png";
    QString jsDir = QStringLiteral(JS_DIR);
    const QStringList args = app.arguments();
    for (int i = 1; i < args.size(); i++) {
        const QString &arg = args[i];
        if (arg == "--roster" && i + 1 < args.size())
            rosterPath = args[++i];
        else if (arg == "--month" && i + 1 < args.size())
            monthPath = args[++i];
        else if (arg == "--today" && i + 1 < args.size())
            todayArg = args[++i];
        else if (arg == "--state" && i + 1 < args.size())
            powerState = args[++i];
        else if (arg == "--out" && i + 1 < args.size())
            outPath = args[++i];
        else if (arg == "--js-dir" && i + 1 < args.size())
            jsDir = args[++i];
        else {
            qWarning() << "unknown argument" << arg;
            return 2;
        }
    }

    if (rosterPath.isEmpty() ||
        !QStringList{"sleep", "off", "empty", "starting", "rebooting", "overheating"}.contains(powerState)) {
        qWarning() << "usage: suspend-writer --roster <roster.json> [--month <YYYY-MM.json>]"
                   << "[--today YYYY-MM-DD] [--out suspended.png] [--state "
                      "sleep|off|empty|starting|rebooting|overheating] [--js-dir <dir>]";
        return 2;
    }

    const QString rosterJson = readFile(rosterPath);
    if (rosterJson.isEmpty())
        return 1;
    const QString monthJson = monthPath.isEmpty() ? QStringLiteral("{}") : readFile(monthPath);

    if (refusesShape(rosterJson, rosterPath, monthJson, monthPath))
        return 2;

    QDate today = QDate::currentDate();
    if (!todayArg.isEmpty()) {
        const QDate parsed = QDate::fromString(todayArg, "yyyy-MM-dd");
        if (parsed.isValid())
            today = parsed;
        else
            qWarning() << "ignoring invalid --today (want YYYY-MM-DD):" << todayArg;
    }

    QString error;
    const QImage image = renderPowerImage(rosterJson, monthJson, today, powerState, jsDir, &error);
    if (image.isNull() || !image.save(outPath)) {
        qWarning() << "Could not render" << outPath << error;
        return 1;
    }
    qInfo() << "wrote" << outPath;
    return 0;
}
