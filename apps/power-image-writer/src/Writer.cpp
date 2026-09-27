#include "Writer.h"
#include "Renderer.h"
#include <QDir>
#include <QFileInfo>
#include <QJsonDocument>
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
void report(const Progress &progress, const QString &phase, const QString &path = {}) {
    progress({{"kind", "progress"}, {"phase", phase}, {"message", path}});
}
} // namespace
Operation parseOperation(const QString &name) {
    static const QStringList names{"render",
                                   "backup",
                                   "restore",
                                   "developer-preview",
                                   "developer-write",
                                   "developer-write-all",
                                   "developer-restore",
                                   "developer-restore-all"};
    const auto index = names.indexOf(name);
    if (index < 0)
        throw Error("Unknown image operation: " + name);
    return static_cast<Operation>(index);
}
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
QJsonObject Writer::settings() const {
    const auto path = environment.appDirectory + "/settings.json";
    if (!files.exists(path))
        return {};
    return readObject(files, path);
}

Snapshot Writer::capture(const QDate &date, const QJsonObject &expected) const {
    const auto rosterPath = environment.appDirectory + "/data/roster.json";
    const auto monthPath = environment.appDirectory + "/data/" + date.toString("yyyy-MM") + ".json";
    const auto roster = files.read(rosterPath);
    const auto month = files.exists(monthPath) ? files.read(monthPath) : QByteArray();
    if (!expected.isEmpty() &&
        (expected["roster"].toString() != contentHash(roster) || expected["month"].toString() != contentHash(month)))
        throw Error("Saved habit data changed before capture", {}, true);
    return parseSnapshot(roster, month, date);
}

QVector<Target> Writer::targets(bool developer, bool single) const {
    const auto app = environment.appDirectory;
    if (environment.testProfile && !developer)
        return {{State::Sleep, app + "/suspend-preview.png", app + "/suspend-preview.png.bak", false, true}};
    const auto system = environment.imageDirectory;
    QVector<Target> all;
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
    QVector<Target> selected;
    for (const auto &target : all)
        if (!target.optional || files.exists(target.path) || files.exists(target.backup))
            selected.append(target);
    return selected;
}

void Writer::validateBootTargets(const QVector<Target> &selected, bool restoring) const {
    for (const auto &target : selected) {
        if (!target.boot)
            continue;
        if (environment.deviceModel != "reMarkable 1.0")
            throw Error("Boot images require reMarkable 1.0", target.path);
        const auto path = restoring || !files.exists(target.path) ? target.backup : target.path;
        try {
            validateBootImage(files.read(path));
            if (!restoring && files.exists(target.backup))
                validateBootImage(files.read(target.backup));
        } catch (const Error &error) {
            throw Error(QString::fromUtf8(error.what()), error.path.isEmpty() ? path : error.path);
        }
    }
}
void Writer::backup(const QVector<Target> &selected, const Progress &progress) {
    validateBootTargets(selected, false);
    for (const auto &target : selected) {
        report(progress, "backing-up", target.path);
        if (files.exists(target.backup)) {
            if (files.read(target.backup).isEmpty())
                throw Error("Original backup is empty", target.backup);
            continue;
        }
        if (environment.testProfile && target.path == environment.appDirectory + "/suspend-preview.png")
            continue;
        const auto original = files.read(target.path);
        if (original.isEmpty())
            throw Error("Original image is empty", target.path);
        files.write(target.backup, original);
    }
}
void Writer::restore(const QVector<Target> &selected, const Progress &progress) {
    validateBootTargets(selected, true);
    lastSignature.clear();
    QVector<QByteArray> originals;
    for (const auto &target : selected) {
        const auto original = files.read(target.backup);
        if (original.isEmpty())
            throw Error("Original backup is empty", target.backup);
        originals.append(original);
    }
    for (int index = 0; index < selected.size(); ++index) {
        report(progress, "restoring", selected[index].path);
        files.write(selected[index].path, originals[index]);
    }
    files.write(signaturePath(), "\"\"");
    lastSignature.clear();
}

void Writer::render(const QVector<Target> &selected, const Snapshot &snapshot, const Progress &progress,
                    bool deduplicate) {
    QByteArray signature = snapshotSignature(snapshot);
    for (const auto &target : selected)
        signature += '\n' + target.path.toUtf8();
    if (deduplicate && !lastSignature.isEmpty() && signature == lastSignature)
        return;
    backup(selected, progress);
    lastSignature.clear();
    QImage base;
    QMap<State, QByteArray> pngs;
    QByteArray boot;
    const auto bytesFor = [&](const Target &target) -> QByteArray {
        if (base.isNull())
            base = renderBase(snapshot);
        if (target.boot) {
            if (boot.isEmpty())
                boot = encodeBootImage(renderState(base, State::Starting));
            return boot;
        }
        if (!pngs.contains(target.state))
            pngs.insert(target.state, encodePng(renderState(base, target.state)));
        return pngs.value(target.state);
    };
    if (!deduplicate) {
        for (const auto &target : selected) {
            QString name = "developer-" + QFileInfo(target.path).fileName();
            if (target.boot)
                name = "developer-boot-splash.bmp";
            else if (target.state == State::Sleep)
                name = "developer-preview.png";
            files.write(environment.appDirectory + "/" + name, bytesFor(target));
        }
    }
    for (int index = 0; index < selected.size(); ++index) {
        const auto &target = selected[index];
        progress(
            {{"kind", "progress"},
             {"phase", "saving"},
             {"message", target.path},
             {"imageProgress", QJsonObject{{"path", target.path}, {"remainingImages", selected.size() - index - 1}}}});
        files.write(target.path, bytesFor(target));
    }
    if (!deduplicate)
        return;
    report(progress, "saving", signaturePath());
    files.write(signaturePath(),
                QJsonDocument(QJsonObject{{"signature", QString::fromUtf8(signature)}}).toJson(QJsonDocument::Compact));
    lastSignature = signature;
}

QJsonObject Writer::execute(const Request &request, const Progress &progress) {
    const bool developer = isDeveloper(request.operation);
    if (developer && !environment.testProfile)
        throw Error("Developer operations require the test build");
    const bool single = request.operation == Operation::WriteOne || request.operation == Operation::RestoreOne;
    auto selected = targets(developer, single);
    if (request.operation == Operation::Backup) {
        backup(selected, progress);
        return {{"ok", true}};
    }
    if (isRestore(request.operation)) {
        if (!developer && settings()["suspendImageEnabled"].toBool())
            throw Error("Disable writing before restoring originals");
        if (environment.testProfile && !developer) {
            files.write(signaturePath(), "\"\"");
            lastSignature.clear();
        } else
            restore(selected, progress);
        return {{"ok", true}};
    }
    if (request.operation == Operation::Render) {
        const auto configuration = settings();
        if (!configuration["suspendImageEnabled"].isBool() || !configuration["suspendImageEnabled"].toBool() ||
            configuration["powerImageRestorePending"].toBool())
            throw Error("Power-state image writing is disabled or restoration is incomplete");
    }
    const auto snapshot = capture(request.date, request.expected);
    progress({{"kind", "captured"}});
    if (request.operation == Operation::Preview) {
        const auto path = environment.appDirectory + "/developer-preview.png";
        report(progress, "saving", path);
        files.write(path, encodePng(renderState(renderBase(snapshot), State::Sleep)));
    } else
        render(selected, snapshot, progress, request.operation == Operation::Render);
    return {{"ok", true}, {"message", "Power-state images saved"}};
}
} // namespace powerimages
