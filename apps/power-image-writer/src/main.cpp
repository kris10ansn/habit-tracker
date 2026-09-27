#include "AppLoadSession.h"
#include "Renderer.h"
#include "WriterProtocol.h"
#include <QCommandLineParser>
#include <QDir>
#include <QFileInfo>
#include <QGuiApplication>
#include <QJsonDocument>
#include <QTextStream>
#include <unistd.h>

using namespace powerimages;

namespace {
QString resolvedPath(const QString &path) {
    const QFileInfo info(path);
    if (info.exists())
        return info.canonicalFilePath();
    const auto parent = info.dir().canonicalPath();
    if (parent.isEmpty())
        throw Error("Output directory does not exist", path);
    return parent + "/" + info.fileName();
}
Environment environment(const QString &directory, bool testProfile) {
    LocalFiles files;
    Environment result;
    result.appDirectory = QDir(directory).absolutePath();
    result.testProfile = testProfile;
    const auto profilePath = result.appDirectory + "/writer-profile.json";
    if (files.exists(profilePath)) {
        const auto profile = QJsonDocument::fromJson(files.read(profilePath)).object();
        if (!profile["testProfile"].isBool())
            throw Error("Invalid writer profile");
        result.testProfile = testProfile || profile["testProfile"].toBool();
    }
    const QString modelPath = "/sys/devices/soc0/machine";
    if (files.exists(modelPath))
        result.deviceModel = QString::fromUtf8(files.read(modelPath)).trimmed();
    return result;
}
#ifdef POWER_IMAGE_HOST_TEST
Environment fixtureEnvironment(const QString &path) {
    LocalFiles files;
    const auto configuration = QJsonDocument::fromJson(files.read(path)).object();
    if (!configuration["appDirectory"].isString() || !configuration["imageDirectory"].isString() ||
        !configuration["bootImageDirectory"].isString())
        throw Error("Invalid host fixture environment");
    auto result = environment(configuration["appDirectory"].toString(), configuration["testProfile"].toBool());
    result.imageDirectory = configuration["imageDirectory"].toString();
    result.bootDirectory = configuration["bootImageDirectory"].toString();
    result.deviceModel = configuration["deviceModel"].toString();
    return result;
}
#endif
int runAppLoad(QGuiApplication &application) {
    const auto args = application.arguments();
    LocalFiles files;
    auto config = environment(QDir::currentPath(), false);
    const auto profilePath = config.appDirectory + "/writer-profile.json";
    if (!files.exists(profilePath))
        throw Error("Missing writer-profile.json");
    QString lockPath = "/tmp/habit-tracker-power-images.lock";
#ifdef POWER_IMAGE_HOST_TEST
    if (args.size() == 4) {
        config = fixtureEnvironment(args[2]);
        lockPath = args[3];
    }
#else
    if (args.size() != 2)
        throw Error("Unexpected AppLoad arguments");
#endif
    AppLoadSession session(args[1], lockPath, config);
    return application.exec();
}

int runStandalone(QGuiApplication &application) {
    LocalFiles files;
    QCommandLineParser parser;
    parser.setApplicationDescription("Render reMarkable power-state images from saved habit JSON.");
    parser.addHelpOption();
    parser.addPositionalArgument("operation", "preview, render, backup, restore, or check-runtime");
    parser.addOptions({{"app-dir", "App directory containing data/ and settings.json", "directory",
                        "/home/root/xovi/exthome/appload/habit-tracker"},
                       {"roster", "Roster JSON for a standalone preview", "path"},
                       {"month", "Month JSON for a standalone preview", "path"},
                       {"date", "Snapshot date (YYYY-MM-DD)", "date", QDate::currentDate().toString(Qt::ISODate)},
                       {"state", "Power state for preview", "state", "sleep"},
                       {"out", "Preview PNG destination", "path"},
                       {"test-profile", "Keep automatic test renders inside the app directory"}});
#ifdef POWER_IMAGE_HOST_TEST
    parser.addOption({"environment", "Host test environment", "path"});
    parser.addOption({"lock-file", "Host test image lock", "path"});
#endif
    parser.process(application);
    if (parser.positionalArguments().size() != 1)
        parser.showHelp(2);
    const auto operation = parser.positionalArguments().first();
    auto config = environment(parser.value("app-dir"), parser.isSet("test-profile"));
#ifdef POWER_IMAGE_HOST_TEST
    if (parser.isSet("environment"))
        config = fixtureEnvironment(parser.value("environment"));
#endif
    if (operation == "check-runtime") {
        const Snapshot empty{QDate::currentDate(), {}};
        encodePng(renderState(renderBase(empty), State::Sleep));
        QTextStream(stdout) << "Power-image writer runtime ready; Qt " << qVersion() << '\n';
        return 0;
    }
    // Session exclusion is CLI policy, independent of the renderer and writer library.
    QLockFile session(config.appDirectory + "/.writer-session.lock");
    session.setStaleLockTime(0);
    if (!session.tryLock(0))
        throw Error("Close the habit app before running a standalone writer command");
    const auto date = parseDate(parser.value("date"));
    Writer writer(files, config);
    if (operation == "preview") {
        if (!parser.isSet("out"))
            throw Error("Preview requires --out");
        const auto output = QFileInfo(parser.value("out")).absoluteFilePath();
        const auto resolved = resolvedPath(output);
        if (!resolved.endsWith(".png") || resolved.startsWith(resolvedPath(config.imageDirectory) + "/") ||
            resolved.startsWith(resolvedPath(config.bootDirectory) + "/") ||
            resolved.startsWith(resolvedPath(config.appDirectory + "/data") + "/"))
            throw Error("Preview must use a PNG path outside device image and habit data directories");
        const auto snapshot =
            parser.isSet("roster")
                ? parseSnapshot(files.read(parser.value("roster")),
                                parser.isSet("month") ? files.read(parser.value("month")) : QByteArray(), date)
                : writer.capture(date);
        files.write(output, encodePng(renderState(renderBase(snapshot), parseState(parser.value("state")))));
        return 0;
    }
    QString lockPath = "/tmp/habit-tracker-power-images.lock";
#ifdef POWER_IMAGE_HOST_TEST
    if (parser.isSet("lock-file"))
        lockPath = parser.value("lock-file");
#endif
    QLockFile lock(lockPath);
    lock.setStaleLockTime(0);
    if (!lock.tryLock(0))
        throw Error("Another image writer is running");
    if (operation != "render" && operation != "backup" && operation != "restore")
        throw Error("Unknown operation");
    writer.execute({WriterProtocol::parseOperation(operation), date, {}}, [](const ProgressEvent &progress) {
        QTextStream(stdout) << QJsonDocument(WriterProtocol::progressMessage(progress)).toJson(QJsonDocument::Compact)
                            << '\n';
    });
    return 0;
}
} // namespace
int main(int argc, char **argv) {
    qputenv("QT_QPA_PLATFORM", "offscreen");
    ::nice(10);
    QGuiApplication application(argc, argv);
    try {
        const auto args = application.arguments();
        if (args.size() >= 2 && args[1].startsWith('/'))
            return runAppLoad(application);
        return runStandalone(application);
    } catch (const std::exception &error) {
        QTextStream(stderr) << error.what() << '\n';
        return 1;
    }
}
