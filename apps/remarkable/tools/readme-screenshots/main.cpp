#include <QCommandLineOption>
#include <QCommandLineParser>
#include <QDate>
#include <QDateTime>
#include <QElapsedTimer>
#include <QFileInfo>
#include <QGuiApplication>
#include <QImage>
#include <QQmlError>
#include <QQuickItem>
#include <QQuickItemGrabResult>
#include <QQuickView>
#include <QThread>
#include <QTime>
#include <QTransform>
#include <QUrl>
#include <QVariantMap>
#include <cstdio>

namespace {
constexpr int kPortraitWidth = 1404;
constexpr int kPortraitHeight = 1872;

int fail(const QString &message) {
    std::fprintf(stderr, "%s\n", qPrintable(message));
    return 2;
}

QString requireExistingFile(const QCommandLineParser &parser, const QCommandLineOption &option) {
    const QString value = parser.value(option);
    return QFileInfo(value).isFile() ? QFileInfo(value).absoluteFilePath() : QString();
}
}  // namespace

int main(int argc, char **argv) {
    qputenv("QT_QPA_PLATFORM", "offscreen");
    qputenv("QT_AUTO_SCREEN_SCALE_FACTOR", "0");
    qputenv("QT_SCALE_FACTOR", "1");
    qputenv("QML_XHR_ALLOW_FILE_READ", "1");
    qputenv("QML_XHR_ALLOW_FILE_WRITE", "1");
    qputenv("QSG_RENDER_LOOP", "basic");
    qputenv("QT_QUICK_BACKEND", "software");

    QGuiApplication app(argc, argv);
    QCoreApplication::setApplicationName(QStringLiteral("readme-screenshot"));

    QCommandLineParser parser;
    parser.setApplicationDescription(QStringLiteral("Capture the live reMarkable QML scene"));
    parser.addHelpOption();
    QCommandLineOption scenarioOption(QStringLiteral("scenario"), QStringLiteral("grid, edit, settings, or pairing"), QStringLiteral("name"));
    QCommandLineOption dataDirOption(QStringLiteral("data-dir"), QStringLiteral("Temporary habit data directory"), QStringLiteral("path"));
    QCommandLineOption settingsOption(QStringLiteral("settings"), QStringLiteral("Temporary settings JSON"), QStringLiteral("path"));
    QCommandLineOption syncOption(QStringLiteral("sync"), QStringLiteral("Temporary sync JSON"), QStringLiteral("path"));
    QCommandLineOption todayOption(QStringLiteral("today"), QStringLiteral("Fixed date in YYYY-MM-DD form"), QStringLiteral("date"));
    QCommandLineOption codeOption(QStringLiteral("pairing-code"), QStringLiteral("Fixture pairing code"), QStringLiteral("code"));
    QCommandLineOption outputOption(QStringLiteral("out"), QStringLiteral("Destination PNG"), QStringLiteral("path"));
    parser.addOptions({scenarioOption, dataDirOption, settingsOption, syncOption, todayOption, codeOption, outputOption});
    parser.process(app);

    const QString scenario = parser.value(scenarioOption);
    if (!QStringList({QStringLiteral("grid"), QStringLiteral("edit"), QStringLiteral("settings"), QStringLiteral("pairing")}).contains(scenario)) {
        return fail(QStringLiteral("Unknown or missing --scenario"));
    }
    const QString dataDir = QFileInfo(parser.value(dataDirOption)).absoluteFilePath();
    const QString settingsPath = requireExistingFile(parser, settingsOption);
    const QString syncPath = requireExistingFile(parser, syncOption);
    const QString outputPath = QFileInfo(parser.value(outputOption)).absoluteFilePath();
    const QDate today = QDate::fromString(parser.value(todayOption), Qt::ISODate);
    if (!QFileInfo(dataDir).isDir() || settingsPath.isEmpty() || syncPath.isEmpty() || !today.isValid() || parser.value(outputOption).isEmpty()) {
        return fail(QStringLiteral("--data-dir, --settings, --sync, --today, and --out are required and must exist"));
    }

    QVariantMap properties;
    properties.insert(QStringLiteral("today"), QDateTime(today, QTime(12, 0), Qt::UTC));
    properties.insert(QStringLiteral("dataDir"), dataDir);
    properties.insert(QStringLiteral("settingsFilePath"), settingsPath);
    properties.insert(QStringLiteral("syncFilePath"), syncPath);
    properties.insert(QStringLiteral("initialView"), scenario == QStringLiteral("grid") || scenario == QStringLiteral("edit") ? QStringLiteral("grid") : QStringLiteral("settings"));
    properties.insert(QStringLiteral("initialEditing"), scenario == QStringLiteral("edit"));
    properties.insert(QStringLiteral("screenshotMode"), true);
    properties.insert(QStringLiteral("screenshotPairingStatus"), scenario == QStringLiteral("pairing") ? QStringLiteral("waiting") : QString());
    properties.insert(QStringLiteral("screenshotPairingCode"), scenario == QStringLiteral("pairing") ? parser.value(codeOption) : QString());

    QQuickView view;
    view.setResizeMode(QQuickView::SizeRootObjectToView);
    view.setInitialProperties(properties);
    view.resize(kPortraitWidth, kPortraitHeight);
    view.setSource(QUrl::fromLocalFile(QStringLiteral(SOURCE_DIR "/Main.qml")));
    if (view.status() != QQuickView::Ready || !view.rootObject()) {
        for (const QQmlError &error : view.errors()) std::fprintf(stderr, "%s\n", qPrintable(error.toString()));
        return fail(QStringLiteral("Could not load Main.qml"));
    }
    view.show();

    QElapsedTimer timer;
    timer.start();
    while (!view.rootObject()->property("screenshotReady").toBool() && timer.elapsed() < 15000) {
        app.processEvents(QEventLoop::AllEvents, 25);
        QThread::msleep(5);
    }
    if (!view.rootObject()->property("screenshotReady").toBool()) {
        return fail(QStringLiteral("Timed out waiting for the QML scene to become ready"));
    }
    for (int frame = 0; frame < 4; ++frame) {
        view.requestUpdate();
        app.processEvents(QEventLoop::AllEvents, 50);
        QThread::msleep(10);
    }

    const auto grab = view.rootObject()->grabToImage(QSize(kPortraitWidth, kPortraitHeight));
    if (!grab) return fail(QStringLiteral("Qt refused the item capture"));
    timer.restart();
    while (grab->image().isNull() && timer.elapsed() < 5000) {
        app.processEvents(QEventLoop::AllEvents, 25);
        QThread::msleep(5);
    }
    QImage portrait = grab->image();
    if (portrait.isNull()) return fail(QStringLiteral("Qt returned an empty item capture"));
    if (portrait.size() != QSize(kPortraitWidth, kPortraitHeight)) {
        portrait = portrait.scaled(kPortraitWidth, kPortraitHeight, Qt::IgnoreAspectRatio, Qt::SmoothTransformation);
    }
    const QImage landscape = portrait.transformed(QTransform().rotate(-90));
    if (landscape.size() != QSize(kPortraitHeight, kPortraitWidth)) {
        return fail(QStringLiteral("Capture has unexpected dimensions: %1x%2 (portrait was %3x%4)")
                        .arg(landscape.width())
                        .arg(landscape.height())
                        .arg(portrait.width())
                        .arg(portrait.height()));
    }
    if (!landscape.save(outputPath, "PNG")) return fail(QStringLiteral("Could not save output PNG"));

    std::printf("captured %s -> %s\n", qPrintable(scenario), qPrintable(outputPath));
    return 0;
}
