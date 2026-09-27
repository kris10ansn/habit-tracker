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
    if (error.error != QJsonParseError::NoError || !document.isObject())
        throw Error("Invalid JSON: " + path, path);
    return document.object();
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
    if (!files.exists(path))
        return {};
    const auto saved = readObject(files, path);
    return {saved["suspendImageEnabled"].toBool(), saved["powerImageRestorePending"].toBool()};
}

Snapshot Writer::capture(const QDate &date, const std::optional<SavedDataFingerprint> &expected) const {
    const auto rosterPath = environment.appDirectory + "/data/roster.json";
    const auto monthPath = environment.appDirectory + "/data/" + date.toString("yyyy-MM") + ".json";
    const auto roster = files.read(rosterPath);
    const auto month = files.exists(monthPath) ? files.read(monthPath) : QByteArray();
    if (expected.has_value() && (expected->roster != contentHash(roster) || expected->month != contentHash(month)))
        throw Error("Saved habit data changed before capture", {}, true);
    return parseSnapshot(roster, month, date);
}

QVector<ImageTarget> Writer::targets(Operation operation) const {
    const bool developer = isDeveloper(operation);
    const bool single = operation == Operation::WriteOne || operation == Operation::RestoreOne;
    const auto app = environment.appDirectory;
    if (environment.testProfile && !developer)
        return {{State::Sleep, app + "/suspend-preview.png", app + "/suspend-preview.png.bak", false, true}};
    const auto system = environment.imageDirectory;
    QVector<ImageTarget> all;
    const QVector<QPair<State, QString>> pngs{{State::Sleep, "suspended"},          {State::Off, "poweroff"},
                                              {State::Empty, "batteryempty"},       {State::Starting, "starting"},
                                              {State::Rebooting, "rebooting"},      {State::Overheating, "overheating"},
                                              {State::Rebooting, "restart-crashed"}};
    for (int index = 0; index < pngs.size(); ++index) {
        const auto name = pngs[index].second;
        const auto path = system + "/" + name + ".png";
        const auto backupPath =
            developer ? app + "/device-" + (index == 0 ? "suspend" : name) + "-original.png" : path + ".bak";
        all.append({pngs[index].first, path, backupPath, false, index >= 3});
        if (single)
            break;
    }
    if (!single) {
        all.append(
            {State::Starting, system + "/splash/splash.bmp", app + "/device-system-splash-original.bmp", true, true});
        all.append({State::Starting, environment.bootDirectory + "/splash.bmp",
                    app + "/device-boot-splash-original.bmp", true, true});
    }
    QVector<ImageTarget> selected;
    for (const auto &target : all)
        if (!target.isOptional || files.exists(target.path) || files.exists(target.backupPath))
            selected.append(target);
    return selected;
}

void Writer::validateBootTargets(const QVector<ImageTarget> &selected, bool restoring) const {
    for (const auto &target : selected) {
        if (!target.isBootImage)
            continue;
        if (environment.deviceModel != "reMarkable 1.0")
            throw Error("Boot images require reMarkable 1.0", target.path);
        const auto path = restoring || !files.exists(target.path) ? target.backupPath : target.path;
        try {
            validateBootImage(files.read(path));
            if (!restoring && files.exists(target.backupPath))
                validateBootImage(files.read(target.backupPath));
        } catch (const Error &error) {
            throw Error(QString::fromUtf8(error.what()), error.path.isEmpty() ? path : error.path);
        }
    }
}
void Writer::backup(const QVector<ImageTarget> &selected, const ProgressCallback &progress) {
    validateBootTargets(selected, false);
    for (const auto &target : selected) {
        progress({ProgressPhase::BackingUp, target.path, {}});
        if (files.exists(target.backupPath)) {
            if (files.read(target.backupPath).isEmpty())
                throw Error("Original backup is empty", target.backupPath);
            continue;
        }
        if (environment.testProfile && target.path == environment.appDirectory + "/suspend-preview.png")
            continue;
        const auto original = files.read(target.path);
        if (original.isEmpty())
            throw Error("Original image is empty", target.path);
        files.write(target.backupPath, original);
    }
}
void Writer::restore(const QVector<ImageTarget> &selected, const ProgressCallback &progress) {
    validateBootTargets(selected, true);
    lastSignature.clear();
    QVector<QByteArray> originals;
    for (const auto &target : selected) {
        const auto original = files.read(target.backupPath);
        if (original.isEmpty())
            throw Error("Original backup is empty", target.backupPath);
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
    for (const auto &target : selected)
        signature += '\n' + target.path.toUtf8();
    if (deduplicate && !lastSignature.isEmpty() && signature == lastSignature)
        return;
    backup(selected, progress);
    lastSignature.clear();
    RenderedImages images(snapshot);
    if (!deduplicate) {
        for (const auto &target : selected) {
            QString name = "developer-" + QFileInfo(target.path).fileName();
            if (target.isBootImage)
                name = "developer-boot-splash.bmp";
            else if (target.state == State::Sleep)
                name = "developer-preview.png";
            files.write(environment.appDirectory + "/" + name,
                        target.isBootImage ? images.bootImage() : images.png(target.state));
        }
    }
    for (int index = 0; index < selected.size(); ++index) {
        const auto &target = selected[index];
        progress({ProgressPhase::Saving, target.path, selected.size() - index - 1});
        files.write(target.path, target.isBootImage ? images.bootImage() : images.png(target.state));
    }
    if (!deduplicate)
        return;
    progress({ProgressPhase::Saving, signaturePath(), {}});
    files.write(signaturePath(),
                QJsonDocument(QJsonObject{{"signature", QString::fromUtf8(signature)}}).toJson(QJsonDocument::Compact));
    lastSignature = signature;
}

void Writer::execute(const Request &request, const ProgressCallback &progress) {
    const bool developer = isDeveloper(request.operation);
    if (developer && !environment.testProfile)
        throw Error("Developer operations require the test build");
    const auto selected = targets(request.operation);
    if (request.operation == Operation::Backup) {
        backup(selected, progress);
        return;
    }
    if (isRestore(request.operation)) {
        if (!developer && settings().writingEnabled)
            throw Error("Disable writing before restoring originals");
        if (environment.testProfile && !developer) {
            files.write(signaturePath(), "\"\"");
            lastSignature.clear();
        } else
            restore(selected, progress);
        return;
    }
    if (request.operation == Operation::Render) {
        const auto configuration = settings();
        if (!configuration.writingEnabled || configuration.restorationPending)
            throw Error("Power-state image writing is disabled or restoration is incomplete");
    }
    const auto snapshot = capture(request.date, request.expected);
    progress({ProgressPhase::Captured, {}, {}});
    if (request.operation == Operation::Preview) {
        const auto path = environment.appDirectory + "/developer-preview.png";
        progress({ProgressPhase::Saving, path, {}});
        files.write(path, encodePng(renderState(renderBase(snapshot), State::Sleep)));
    } else
        render(selected, snapshot, progress, request.operation == Operation::Render);
}
} // namespace powerimages
