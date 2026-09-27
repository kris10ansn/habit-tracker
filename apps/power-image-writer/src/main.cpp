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
    if (info.exists()) {
        return info.canonicalFilePath();
    }

    const auto parent = info.dir().canonicalPath();
    if (parent.isEmpty()) {
        throw Error("Output directory does not exist", path);
    }

    return parent + "/" + info.fileName();
}

bool savedTestProfile(const Files &files, const QString &appDirectory) {
    const auto profilePath = appDirectory + "/writer-profile.json";
    if (!files.exists(profilePath)) {
        return false;
    }

    const auto profile = QJsonDocument::fromJson(files.read(profilePath)).object();
    if (!profile["testProfile"].isBool()) {
        throw Error("Invalid writer profile");
    }

    return profile["testProfile"].toBool();
}

Environment environment(const QString &directory, bool testProfile) {
    LocalFiles files;
    Environment result;
    result.appDirectory = QDir(directory).absolutePath();
    const bool installedTestProfile = savedTestProfile(files, result.appDirectory);
    result.testProfile = testProfile || installedTestProfile;

    const QString modelPath = "/sys/devices/soc0/machine";
    if (files.exists(modelPath)) {
        result.deviceModel = QString::fromUtf8(files.read(modelPath)).trimmed();
    }

    return result;
}

#ifdef POWER_IMAGE_HOST_TEST
Environment fixtureEnvironment(const QString &path) {
    LocalFiles files;
    const auto configuration = QJsonDocument::fromJson(files.read(path)).object();
    if (!configuration["appDirectory"].isString() || !configuration["imageDirectory"].isString() ||
        !configuration["bootImageDirectory"].isString()) {
        throw Error("Invalid host fixture environment");
    }

    auto result = environment(configuration["appDirectory"].toString(), configuration["testProfile"].toBool());
    result.imageDirectory = configuration["imageDirectory"].toString();
    result.bootDirectory = configuration["bootImageDirectory"].toString();
    result.deviceModel = configuration["deviceModel"].toString();
    return result;
}
#endif

int runAppLoad(QGuiApplication &application) {
    const auto arguments = application.arguments();
    LocalFiles files;
    auto configuration = environment(QDir::currentPath(), false);
    const auto profilePath = configuration.appDirectory + "/writer-profile.json";
    if (!files.exists(profilePath)) {
        throw Error("Missing writer-profile.json");
    }

    QString lockPath = "/tmp/habit-tracker-power-images.lock";
#ifdef POWER_IMAGE_HOST_TEST
    if (arguments.size() == 4) {
        configuration = fixtureEnvironment(arguments[2]);
        lockPath = arguments[3];
    }
#else
    if (arguments.size() != 2) {
        throw Error("Unexpected AppLoad arguments");
    }
#endif
    AppLoadSession session(arguments[1], lockPath, configuration);
    return application.exec();
}

QString previewOutputPath(const QCommandLineParser &parser, const Environment &configuration) {
    if (!parser.isSet("out")) {
        throw Error("Preview requires --out");
    }

    const auto outputPath = QFileInfo(parser.value("out")).absoluteFilePath();
    const auto resolvedOutputPath = resolvedPath(outputPath);
    if (!resolvedOutputPath.endsWith(".png") ||
        resolvedOutputPath.startsWith(resolvedPath(configuration.imageDirectory) + "/") ||
        resolvedOutputPath.startsWith(resolvedPath(configuration.bootDirectory) + "/") ||
        resolvedOutputPath.startsWith(resolvedPath(configuration.appDirectory + "/data") + "/")) {
        throw Error("Preview must use a PNG path outside device image and habit data directories");
    }

    return outputPath;
}

Snapshot previewSnapshot(const QCommandLineParser &parser, const Files &files, const Writer &writer,
                         const QDate &date) {
    if (!parser.isSet("roster")) {
        return writer.capture(date);
    }

    const auto roster = files.read(parser.value("roster"));
    const auto month = parser.isSet("month") ? files.read(parser.value("month")) : QByteArray();
    return parseSnapshot(roster, month, date);
}

void writePreview(const QCommandLineParser &parser, Files &files, const Writer &writer,
                  const Environment &configuration, const QDate &date) {
    const auto outputPath = previewOutputPath(parser, configuration);
    const auto snapshot = previewSnapshot(parser, files, writer, date);
    const auto state = parseState(parser.value("state"));
    const auto image = renderState(renderBase(snapshot), state);

    files.write(outputPath, encodePng(image));
}

int runStandalone(QGuiApplication &application) {
    LocalFiles files;
    QCommandLineParser parser;
    parser.setApplicationDescription("Render reMarkable power-state images from saved habit JSON.");
    parser.addHelpOption();
    parser.addPositionalArgument("operation", "preview, render, backup, restore, or check-runtime");
    parser.addOptions({
        {"app-dir", "App directory containing data/ and settings.json", "directory",
         "/home/root/xovi/exthome/appload/habit-tracker"},
        {"roster", "Roster JSON for a standalone preview", "path"},
        {"month", "Month JSON for a standalone preview", "path"},
        {"date", "Snapshot date (YYYY-MM-DD)", "date", QDate::currentDate().toString(Qt::ISODate)},
        {"state", "Power state for preview", "state", "sleep"},
        {"out", "Preview PNG destination", "path"},
        {"test-profile", "Keep automatic test renders inside the app directory"},
    });
#ifdef POWER_IMAGE_HOST_TEST
    parser.addOption({"environment", "Host test environment", "path"});
    parser.addOption({"lock-file", "Host test image lock", "path"});
#endif
    parser.process(application);
    if (parser.positionalArguments().size() != 1) {
        parser.showHelp(2);
    }

    const auto operation = parser.positionalArguments().first();
    auto configuration = environment(parser.value("app-dir"), parser.isSet("test-profile"));
#ifdef POWER_IMAGE_HOST_TEST
    if (parser.isSet("environment")) {
        configuration = fixtureEnvironment(parser.value("environment"));
    }
#endif
    if (operation == "check-runtime") {
        const Snapshot empty{QDate::currentDate(), {}};
        encodePng(renderState(renderBase(empty), State::Sleep));
        QTextStream(stdout) << "Power-image writer runtime ready; Qt " << qVersion() << '\n';
        return 0;
    }

    // Session exclusion is CLI policy, independent of the renderer and writer library.
    QLockFile session(configuration.appDirectory + "/.writer-session.lock");
    session.setStaleLockTime(0);
    if (!session.tryLock(0)) {
        throw Error("Close the habit app before running a standalone writer command");
    }

    const auto date = parseDate(parser.value("date"));
    Writer writer(files, configuration);
    if (operation == "preview") {
        writePreview(parser, files, writer, configuration, date);
        return 0;
    }

    QString lockPath = "/tmp/habit-tracker-power-images.lock";
#ifdef POWER_IMAGE_HOST_TEST
    if (parser.isSet("lock-file")) {
        lockPath = parser.value("lock-file");
    }
#endif
    QLockFile lock(lockPath);
    lock.setStaleLockTime(0);
    if (!lock.tryLock(0)) {
        throw Error("Another image writer is running");
    }

    if (operation != "render" && operation != "backup" && operation != "restore") {
        throw Error("Unknown operation");
    }

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
        const auto arguments = application.arguments();
        if (arguments.size() >= 2 && arguments[1].startsWith('/')) {
            return runAppLoad(application);
        }

        return runStandalone(application);
    } catch (const std::exception &error) {
        QTextStream(stderr) << error.what() << '\n';
        return 1;
    }
}
