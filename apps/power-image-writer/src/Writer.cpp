#include "Writer.h"
#include "Renderer.h"

#include <QDir>
#include <QFileInfo>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonParseError>
#include <utility>

namespace powerimages {
namespace {
QJsonObject readObject(const Files &files, const QString &path) {
    QJsonParseError error;
    const auto document = QJsonDocument::fromJson(files.read(path), &error);
    if (error.error != QJsonParseError::NoError || !document.isObject()) {
        throw Error("Invalid JSON: " + path, path);
    }

    return document.object();
}

QByteArray readNonEmptyFile(const Files &files, const QString &path, const QString &errorMessage) {
    const auto contents = files.read(path);
    if (contents.isEmpty()) {
        throw Error(errorMessage, path);
    }

    return contents;
}

void validateBootTarget(const Files &files, const QString &deviceModel, const ImageTarget &target, bool restoring) {
    if (deviceModel != "reMarkable 1.0") {
        throw Error("Boot images require reMarkable 1.0", target.path);
    }

    const auto path = restoring || !files.exists(target.path) ? target.backupPath : target.path;
    try {
        validateBootImage(files.read(path));

        if (!restoring && files.exists(target.backupPath)) {
            validateBootImage(files.read(target.backupPath));
        }
    } catch (const Error &error) {
        const auto failedPath = error.path.isEmpty() ? path : error.path;
        throw Error(QString::fromUtf8(error.what()), failedPath);
    }
}

QString developerPreviewName(const ImageTarget &target) {
    if (target.isBootImage) {
        return "developer-boot-splash.bmp";
    }

    if (target.state == State::Sleep) {
        return "developer-preview.png";
    }

    return "developer-" + QFileInfo(target.path).fileName();
}

} // namespace

bool isDeveloper(Operation operation) {
    return operation == Operation::Preview || operation == Operation::WriteOne || operation == Operation::WriteAll ||
           operation == Operation::RestoreOne || operation == Operation::RestoreAll;
}

bool isRestore(Operation operation) {
    return operation == Operation::Restore || operation == Operation::RestoreOne || operation == Operation::RestoreAll;
}

bool requiresData(Operation operation) {
    return operation != Operation::Backup && !isRestore(operation);
}

Writer::Writer(Files &files, Environment environment) : files(files), environment(std::move(environment)) {}

QString Writer::signaturePath() const {
    return environment.appDirectory + "/.sleep-sig";
}

Writer::Settings Writer::settings() const {
    const auto path = environment.appDirectory + "/settings.json";
    if (!files.exists(path)) {
        return {};
    }

    const auto saved = readObject(files, path);
    return {saved["suspendImageEnabled"].toBool(), saved["powerImageRestorePending"].toBool()};
}

Snapshot Writer::capture(const QDate &date, const std::optional<SavedDataFingerprint> &expected) const {
    const auto rosterPath = environment.appDirectory + "/data/roster.json";
    const auto monthPath = environment.appDirectory + "/data/" + date.toString("yyyy-MM") + ".json";
    const auto roster = files.read(rosterPath);
    const auto month = files.exists(monthPath) ? files.read(monthPath) : QByteArray();
    if (expected.has_value() && (expected->roster != contentHash(roster) || expected->month != contentHash(month))) {
        throw Error("Saved habit data changed before capture", {}, true);
    }

    return parseSnapshot(roster, month, date);
}

QVector<ImageTarget> Writer::targets(Operation operation) const {
    const bool developerOperation = isDeveloper(operation);
    const bool singleImage = operation == Operation::WriteOne || operation == Operation::RestoreOne;
    const auto appDirectory = environment.appDirectory;
    if (environment.testProfile && !developerOperation) {
        return {{State::Sleep, appDirectory + "/suspend-preview.png", appDirectory + "/suspend-preview.png.bak", false,
                 true}};
    }

    const auto imageDirectory = environment.imageDirectory;

    QVector<ImageTarget> imageTargets;
    const QVector<QPair<State, QString>> pngStates{
        {State::Sleep, "suspended"},           {State::Off, "poweroff"},        {State::Empty, "batteryempty"},
        {State::Starting, "starting"},         {State::Rebooting, "rebooting"}, {State::Overheating, "overheating"},
        {State::Rebooting, "restart-crashed"},
    };

    for (int index = 0; index < pngStates.size(); ++index) {
        const auto name = pngStates[index].second;
        const auto path = imageDirectory + "/" + name + ".png";
        const auto backupName = index == 0 ? QString("suspend") : name;
        const auto backupPath =
            developerOperation ? appDirectory + "/device-" + backupName + "-original.png" : path + ".bak";

        imageTargets.append({pngStates[index].first, path, backupPath, false, index >= 3});
        if (singleImage) {
            break;
        }
    }

    if (!singleImage) {
        imageTargets.append({State::Starting, imageDirectory + "/splash/splash.bmp",
                             appDirectory + "/device-system-splash-original.bmp", true, true});
        imageTargets.append({State::Starting, environment.bootDirectory + "/splash.bmp",
                             appDirectory + "/device-boot-splash-original.bmp", true, true});
    }

    QVector<ImageTarget> selectedTargets;
    for (const auto &target : imageTargets) {
        if (!target.isOptional || files.exists(target.path) || files.exists(target.backupPath)) {
            selectedTargets.append(target);
        }
    }

    return selectedTargets;
}

void Writer::validateBootTargets(const QVector<ImageTarget> &selected, bool restoring) const {
    for (const auto &target : selected) {
        if (!target.isBootImage) {
            continue;
        }

        validateBootTarget(files, environment.deviceModel, target, restoring);
    }
}

void Writer::backup(const QVector<ImageTarget> &selected, const ProgressCallback &progress) {
    validateBootTargets(selected, false);

    for (const auto &target : selected) {
        progress({ProgressPhase::BackingUp, target.path, {}});
        if (files.exists(target.backupPath)) {
            readNonEmptyFile(files, target.backupPath, "Original backup is empty");
            continue;
        }

        if (environment.testProfile && target.path == environment.appDirectory + "/suspend-preview.png") {
            continue;
        }

        const auto original = readNonEmptyFile(files, target.path, "Original image is empty");
        files.write(target.backupPath, original);
    }
}

void Writer::restore(const QVector<ImageTarget> &selected, const ProgressCallback &progress) {
    validateBootTargets(selected, true);
    lastSignature.clear();

    QVector<QByteArray> originals;
    for (const auto &target : selected) {
        const auto original = readNonEmptyFile(files, target.backupPath, "Original backup is empty");
        originals.append(original);
    }

    for (int index = 0; index < selected.size(); ++index) {
        progress({ProgressPhase::Restoring, selected[index].path, {}});
        files.write(selected[index].path, originals[index]);
    }

    files.write(signaturePath(), "\"\"");
    lastSignature.clear();
}

void Writer::render(const QVector<ImageTarget> &selected, const Snapshot &snapshot, const ProgressCallback &progress,
                    bool deduplicate) {
    QByteArray signature = snapshotSignature(snapshot);
    for (const auto &target : selected) {
        signature += '\n' + target.path.toUtf8();
    }

    if (deduplicate && !lastSignature.isEmpty() && signature == lastSignature) {
        return;
    }

    backup(selected, progress);
    lastSignature.clear();

    RenderedImages images(snapshot);
    if (!deduplicate) {
        writeDeveloperPreviews(selected, images);
    }

    for (int index = 0; index < selected.size(); ++index) {
        const auto &target = selected[index];
        progress({ProgressPhase::Saving, target.path, selected.size() - index - 1});
        files.write(target.path, target.isBootImage ? images.bootImage() : images.png(target.state));
    }

    if (!deduplicate) {
        return;
    }

    progress({ProgressPhase::Saving, signaturePath(), {}});
    const QJsonObject signatureRecord{{"signature", QString::fromUtf8(signature)}};
    const auto signatureBytes = QJsonDocument(signatureRecord).toJson(QJsonDocument::Compact);
    files.write(signaturePath(), signatureBytes);
    lastSignature = signature;
}

void Writer::writeDeveloperPreviews(const QVector<ImageTarget> &selected, RenderedImages &images) {
    for (const auto &target : selected) {
        const auto path = environment.appDirectory + "/" + developerPreviewName(target);
        const auto bytes = target.isBootImage ? images.bootImage() : images.png(target.state);
        files.write(path, bytes);
    }
}

void Writer::requireWritingEnabled() const {
    const auto configuration = settings();
    if (!configuration.writingEnabled || configuration.restorationPending) {
        throw Error("Power-state image writing is disabled or restoration is incomplete");
    }
}

void Writer::execute(const Request &request, const ProgressCallback &progress) {
    const bool developer = isDeveloper(request.operation);
    if (developer && !environment.testProfile) {
        throw Error("Developer operations require the test build");
    }

    const auto selected = targets(request.operation);
    if (request.operation == Operation::Backup) {
        backup(selected, progress);
        return;
    }

    const bool restoring = isRestore(request.operation);
    if (restoring && !developer && settings().writingEnabled) {
        throw Error("Disable writing before restoring originals");
    }

    if (restoring && environment.testProfile && !developer) {
        files.write(signaturePath(), "\"\"");
        lastSignature.clear();
        return;
    }

    if (restoring) {
        restore(selected, progress);
        return;
    }

    if (request.operation == Operation::Render) {
        requireWritingEnabled();
    }

    const auto snapshot = capture(request.date, request.expected);
    progress({ProgressPhase::Captured, {}, {}});

    if (request.operation == Operation::Preview) {
        const auto path = environment.appDirectory + "/developer-preview.png";
        progress({ProgressPhase::Saving, path, {}});
        files.write(path, encodePng(renderState(renderBase(snapshot), State::Sleep)));
        return;
    }

    render(selected, snapshot, progress, request.operation == Operation::Render);
}

} // namespace powerimages
