#include "LaunchConfiguration.h"

#include <QDir>
#include <QJsonDocument>
#include <QJsonObject>

namespace powerimages {
    namespace {
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

        Environment installedEnvironment(const QString &directory, bool testProfile) {
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

        LaunchConfiguration installedAppLoadConfiguration() {
            LocalFiles files;
            LaunchConfiguration configuration{installedEnvironment(QDir::currentPath(), false)};
            if (!files.exists(configuration.environment.appDirectory + "/writer-profile.json")) {
                throw Error("Missing writer-profile.json");
            }

            return configuration;
        }

        LaunchConfiguration installedCommandLineConfiguration(const QCommandLineParser &parser) {
            return {installedEnvironment(parser.value("app-dir"), parser.isSet("test-profile"))};
        }
    } // namespace

// Fixture paths are compiled only into host test builds. Both builds expose the same startup API.
#ifdef POWER_IMAGE_HOST_TEST
    namespace {
        Environment fixtureEnvironment(const QString &path) {
            LocalFiles files;
            const auto configuration = QJsonDocument::fromJson(files.read(path)).object();
            if (!configuration["appDirectory"].isString() || !configuration["imageDirectory"].isString() ||
                !configuration["bootImageDirectory"].isString()) {
                throw Error("Invalid host fixture environment");
            }

            auto result =
                installedEnvironment(configuration["appDirectory"].toString(), configuration["testProfile"].toBool());
            result.imageDirectory = configuration["imageDirectory"].toString();
            result.bootDirectory = configuration["bootImageDirectory"].toString();
            result.deviceModel = configuration["deviceModel"].toString();

            return result;
        }
    } // namespace

    void LaunchConfiguration::addBuildOptions(QCommandLineParser &parser) {
        parser.addOption({"environment", "Host test environment", "path"});
        parser.addOption({"lock-file", "Host test image lock", "path"});
    }

    LaunchConfiguration LaunchConfiguration::forCommandLine(const QCommandLineParser &parser) {
        auto configuration = installedCommandLineConfiguration(parser);
        if (parser.isSet("environment")) {
            configuration.environment = fixtureEnvironment(parser.value("environment"));
        }

        if (parser.isSet("lock-file")) {
            configuration.imageLockPath = parser.value("lock-file");
        }

        return configuration;
    }

    LaunchConfiguration LaunchConfiguration::forAppLoad(const QStringList &arguments) {
        auto configuration = installedAppLoadConfiguration();
        if (arguments.size() == 4) {
            configuration.environment = fixtureEnvironment(arguments[2]);
            configuration.imageLockPath = arguments[3];
        }

        return configuration;
    }
#else
    void LaunchConfiguration::addBuildOptions(QCommandLineParser &) {}

    LaunchConfiguration LaunchConfiguration::forCommandLine(const QCommandLineParser &parser) {
        return installedCommandLineConfiguration(parser);
    }

    LaunchConfiguration LaunchConfiguration::forAppLoad(const QStringList &arguments) {
        const auto configuration = installedAppLoadConfiguration();
        if (arguments.size() != 2) {
            throw Error("Unexpected AppLoad arguments");
        }

        return configuration;
    }
#endif
} // namespace powerimages
