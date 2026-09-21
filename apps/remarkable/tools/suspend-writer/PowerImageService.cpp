#include "PowerImageService.h"
#include "Renderer.h"
#include <QCryptographicHash>
#include <QDebug>
#include <QFile>
#include <QFileInfo>
#include <QGuiApplication>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QPointer>
#include <QProcess>
#include <QQueue>
#include <QSaveFile>
#include <QTcpServer>
#include <QTcpSocket>
#include <QTimer>
#include <QUuid>
#include <cstdio>

namespace {
struct Configuration {
    QString profile, appDirectory, imageDirectory, jsDirectory;
    quint16 port;
};
struct Target {
    QString state, path, backup;
};
QString option(const QStringList &arguments, const QString &name, const QString &fallback = {}) {
    const int index = arguments.indexOf(name);
    return index >= 0 && index + 1 < arguments.size() ? arguments[index + 1] : fallback;
}
QByteArray readBytes(const QString &path) {
    QFile file(path);
    return file.open(QIODevice::ReadOnly) ? file.readAll() : QByteArray();
}
QJsonObject failure(const QString &message, const QString &path = {}) {
    return {{"ok", false}, {"error", message}, {"path", path}};
}
QJsonObject success(const QString &signature = {}) { return {{"ok", true}, {"signature", signature}}; }
QString resolvedDestination(const QString &path) {
    const QFileInfo file(path);
    return file.isSymLink() ? file.canonicalFilePath() : path;
}
bool atomicWrite(const QString &path, const QByteArray &bytes) {
    const QString destination = resolvedDestination(path);
    if (destination.isEmpty())
        return false;
    QSaveFile file(destination);
    if (!file.open(QIODevice::WriteOnly) || file.write(bytes) != bytes.size())
        return false;
    return file.commit() && readBytes(destination) == bytes;
}
bool saveImage(const QString &path, const QImage &image) {
    const QString destination = resolvedDestination(path);
    if (destination.isEmpty())
        return false;
    QSaveFile file(destination);
    if (!file.open(QIODevice::WriteOnly) || !image.save(&file, "PNG"))
        return false;
    return file.commit();
}
QList<Target> targets(const Configuration &configuration) {
    if (configuration.profile == "test")
        return {};
    const QStringList names = {"suspended", "poweroff",    "batteryempty",   "starting",
                               "rebooting", "overheating", "restart-crashed"};
    const QStringList states = {"sleep", "off", "empty", "starting", "rebooting", "overheating", "rebooting"};
    QList<Target> result;
    for (int index = 0; index < names.size(); index++) {
        const QString path = configuration.imageDirectory + "/" + names[index] + ".png";
        if (index < 3 || QFileInfo::exists(path) || QFileInfo::exists(path + ".bak"))
            result.append({states[index], path, path + ".bak"});
    }
    return result;
}
QJsonObject backup(const QList<Target> &images) {
    for (const Target &target : images) {
        if (QFileInfo::exists(target.backup)) {
            if (QImage(target.backup).isNull())
                return failure("Original backup is unreadable", target.backup);
            continue;
        }
        const QByteArray original = readBytes(target.path);
        if (QImage::fromData(original).isNull())
            return failure("Original image is unreadable", target.path);
        if (!atomicWrite(target.backup, original))
            return failure("Could not verify original backup", target.backup);
    }
    return success();
}
QJsonObject restore(const QList<Target> &images) {
    // Validate every original before replacing any image.
    for (const Target &target : images) {
        if (QImage(target.backup).isNull())
            return failure("Original backup is unreadable", target.backup);
    }
    for (const Target &target : images) {
        if (!atomicWrite(target.path, readBytes(target.backup)))
            return failure("Could not restore original", target.path);
    }
    return success();
}
bool validSnapshot(const QJsonObject &request) {
    if (!QDate::fromString(request.value("date").toString(), "yyyy-MM-dd").isValid())
        return false;
    const QJsonObject roster = request.value("roster").toObject();
    const QJsonObject month = request.value("month").toObject();
    if (!roster.value("habits").isArray() || !month.value("entries").isArray())
        return false;
    if (month.value("month").toString() != request.value("date").toString().left(7))
        return false;
    for (const QJsonValue &value : roster.value("habits").toArray()) {
        const QJsonObject habit = value.toObject();
        if (!habit.value("isPrivate").isBool() || !habit.value("name").isString() ||
            !habit.value("id").isString() || !habit.value("editedAt").isDouble() ||
            !QStringList{"Positive", "Negative"}.contains(habit.value("polarity").toString()))
            return false;
    }
    for (const QJsonValue &value : month.value("entries").toArray()) {
        const QJsonObject entry = value.toObject();
        if (!entry.value("habitId").isString() || !entry.value("date").isString() ||
            !entry.value("editedAt").isDouble())
            return false;
    }
    return true;
}
QString signature(const QJsonObject &request, const QList<Target> &images) {
    QByteArray contents = "native-power-images-v1\n" + QJsonDocument(request).toJson(QJsonDocument::Compact);
    for (const Target &target : images)
        contents += target.path.toUtf8() + '\n';
    return QString::fromLatin1(QCryptographicHash::hash(contents, QCryptographicHash::Sha256).toHex());
}
QJsonObject render(const Configuration &configuration, const QJsonObject &request, bool preview) {
    if (!validSnapshot(request))
        return failure("Invalid power-state snapshot");
    QList<Target> images = targets(configuration);
    if (preview || configuration.profile == "test")
        images = {{"sleep", configuration.appDirectory + "/suspend-preview.png", {}}};
    const QString nextSignature = signature(request, images);
    const QString signaturePath = configuration.appDirectory + "/.power-image-signature";
    if (!preview && readBytes(signaturePath) == nextSignature.toUtf8())
        return success(nextSignature);
    if (!preview && configuration.profile != "test") {
        const QJsonObject backedUp = backup(images);
        if (!backedUp.value("ok").toBool())
            return backedUp;
    }
    // A failed/cancelled batch may replace only some images. Invalidate the old signature
    // before the first replacement so reverting to its snapshot cannot skip repair.
    if (!preview && !atomicWrite(signaturePath, {}))
        return failure("Could not invalidate image signature", signaturePath);
    const QString roster = QString::fromUtf8(QJsonDocument(request.value("roster").toObject()).toJson());
    const QString month = QString::fromUtf8(QJsonDocument(request.value("month").toObject()).toJson());
    const QDate today = QDate::fromString(request.value("date").toString(), "yyyy-MM-dd");
    for (const Target &target : images) {
        QString error;
        const QImage image =
            renderPowerImage(roster, month, today, target.state, configuration.jsDirectory, &error);
        if (image.isNull())
            return failure(error, target.path);
        if (!saveImage(target.path, image))
            return failure("Could not save power-state image", target.path);
    }
    if (!preview && !atomicWrite(signaturePath, nextSignature.toUtf8()))
        return failure("Could not save completed image signature", signaturePath);
    return success(nextSignature);
}
QJsonObject perform(const Configuration &configuration, const QString &operation,
                    const QJsonObject &request) {
    const auto images = targets(configuration);
    if (operation == "render" || operation == "preview")
        return render(configuration, request, operation == "preview");
    if (operation == "backup")
        return backup(images);
    if (operation == "restore") {
        const QString path = configuration.appDirectory + "/.power-image-signature";
        if (!atomicWrite(path, {}))
            return failure("Could not invalidate image signature", path);
        return restore(images);
    }
    if (configuration.profile != "test")
        return failure("Test operation unavailable in stable install");
    const Target testImage{"sleep", configuration.imageDirectory + "/suspended.png",
                           configuration.appDirectory + "/device-suspend-original.png"};
    if (operation == "test-restore")
        return restore({testImage});
    if (operation != "test-write")
        return failure("Unknown operation");
    const auto backedUp = backup({testImage});
    if (!backedUp.value("ok").toBool())
        return backedUp;
    const QByteArray preview = readBytes(configuration.appDirectory + "/suspend-preview.png");
    if (QImage::fromData(preview).isNull())
        return failure("Preview is unreadable");
    return atomicWrite(testImage.path, preview) ? success()
                                                : failure("Could not publish preview", testImage.path);
}

struct Job {
    QString operation;
    QJsonObject request;
    QString id;
};
class Service : public QObject {
  public:
    explicit Service(const Configuration &configuration) : configuration(configuration) {
        connect(&server, &QTcpServer::newConnection, this, [this] { acceptConnections(); });
        connect(&worker, qOverload<int, QProcess::ExitStatus>(&QProcess::finished), this,
                [this](int code, QProcess::ExitStatus status) {
                    finish(code == 0 && status == QProcess::NormalExit);
                });
        connect(&worker, &QProcess::errorOccurred, this, [this](QProcess::ProcessError error) {
            if (error == QProcess::FailedToStart)
                finish(false);
        });
        workerTimeout.setSingleShot(true);
        connect(&workerTimeout, &QTimer::timeout, this, [this] { worker.kill(); });
    }
    bool start() {
        const QString tokenPath = configuration.appDirectory + "/power-image-token.json";
        token = QUuid::createUuid().toString(QUuid::WithoutBraces).toUtf8();
        if (!server.listen(QHostAddress::LocalHost, configuration.port))
            return false;
        if (!atomicWrite(tokenPath, "\"" + token + "\""))
            return false;
        QFile::setPermissions(tokenPath, QFileDevice::ReadOwner | QFileDevice::WriteOwner);
        qInfo() << "Power-image helper listening on localhost port" << server.serverPort();
        return true;
    }

  private:
    Configuration configuration;
    QTcpServer server;
    QProcess worker;
    QTimer workerTimeout;
    QByteArray token;
    QQueue<Job> jobs;
    QMap<QString, QJsonObject> results;
    QQueue<QString> completedIds;
    Job active;
    bool running = false;
    bool cancelled = false;
    bool renderingEnabled = true;

    void respond(QTcpSocket *socket, const QJsonObject &result, int status = 200) {
        if (!socket || socket->state() == QAbstractSocket::UnconnectedState)
            return;
        const QByteArray body = QJsonDocument(result).toJson(QJsonDocument::Compact);
        socket->write("HTTP/1.1 " + QByteArray::number(status) +
                      " Response\r\nContent-Type: application/json\r\nConnection: close\r\nContent-Length: " +
                      QByteArray::number(body.size()) + "\r\n\r\n" + body);
        socket->disconnectFromHost();
    }
    void acceptConnections() {
        while (server.hasPendingConnections()) {
            QTcpSocket *socket = server.nextPendingConnection();
            socket->setParent(this);
            connect(socket, &QTcpSocket::disconnected, socket, &QObject::deleteLater);
            connect(socket, &QTcpSocket::readyRead, this, [this, socket] { readRequest(socket); });
            QTimer::singleShot(10000, socket, [socket] {
                if (!socket->property("accepted").toBool())
                    socket->disconnectFromHost();
            });
        }
    }
    void readRequest(QTcpSocket *socket) {
        if (socket->property("accepted").toBool()) {
            socket->readAll();
            return;
        }
        QByteArray buffer = socket->property("buffer").toByteArray() + socket->readAll();
        if (buffer.size() > 1024 * 1024) {
            respond(socket, failure("Request too large"), 413);
            return;
        }
        socket->setProperty("buffer", buffer);
        const int boundary = buffer.indexOf("\r\n\r\n");
        if (boundary < 0)
            return;
        const QList<QByteArray> lines = buffer.left(boundary).split('\n');
        const QList<QByteArray> first = lines.first().trimmed().split(' ');
        QMap<QByteArray, QByteArray> headers;
        for (const QByteArray &line : lines.mid(1)) {
            const int colon = line.indexOf(':');
            if (colon > 0)
                headers[line.left(colon).trimmed().toLower()] = line.mid(colon + 1).trimmed();
        }
        bool validLength = false;
        const int length = headers.value("content-length").toInt(&validLength);
        if (!validLength || length < 0 || length > 1024 * 1024) {
            respond(socket, failure("Invalid length"), 400);
            return;
        }
        if (buffer.size() - boundary - 4 < length)
            return;
        socket->setProperty("accepted", true);
        socket->setProperty("buffer", QVariant());
        if (headers.value("authorization") != "Bearer " + token || headers.contains("origin")) {
            respond(socket, failure("Unauthorized local request"), 403);
            return;
        }
        if (first.size() != 3 || first[0] != "POST" ||
            headers.value("content-type").split(';').first().trimmed().toLower() != "application/json") {
            respond(socket, failure("Expected JSON POST"), 400);
            return;
        }
        const QString operation = QString::fromLatin1(first[1].mid(1));
        const QStringList allowed = {"render", "preview",    "backup",       "restore",
                                     "cancel", "test-write", "test-restore", "status"};
        QJsonParseError parseError;
        const QJsonDocument document = QJsonDocument::fromJson(buffer.mid(boundary + 4, length), &parseError);
        if (!allowed.contains(operation) || parseError.error != QJsonParseError::NoError ||
            !document.isObject()) {
            respond(socket, failure("Invalid request"), 400);
            return;
        }
        if (operation == "status") {
            const QString id = document.object().value("jobId").toString();
            respond(socket, results.value(id, failure("Unknown helper job")));
            return;
        }
        if (operation == "restore")
            renderingEnabled = false;
        if (operation == "render" && !renderingEnabled) {
            respond(socket, failure("Image writing is paused until backup succeeds"));
            return;
        }
        if (operation == "restore" || operation == "cancel" || operation == "test-restore")
            cancelRenders();
        if (operation == "cancel") {
            respond(socket, success());
            return;
        }
        if (operation == "render")
            supersedeQueuedRenders();
        if (jobs.size() >= 8) {
            respond(socket, failure("Helper queue full"), 503);
            return;
        }
        const QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
        results[id] = {{"ok", true}, {"pending", true}};
        jobs.enqueue({operation, document.object(), id});
        respond(socket, {{"ok", true}, {"accepted", true}, {"jobId", id}});
        startNext();
    }
    void supersedeQueuedRenders() {
        QQueue<Job> remaining;
        while (!jobs.isEmpty()) {
            Job job = jobs.dequeue();
            if (job.operation == "render" || job.operation == "preview")
                complete(job.id, {{"ok", false}, {"cancelled", true}});
            else
                remaining.enqueue(job);
        }
        jobs = remaining;
    }
    void cancelRenders() {
        supersedeQueuedRenders();
        if (running && (active.operation == "render" || active.operation == "preview")) {
            cancelled = true;
            worker.kill();
        }
    }
    void startNext() {
        if (running || jobs.isEmpty())
            return;
        active = jobs.dequeue();
        running = true;
        cancelled = false;
        const QStringList arguments = {"--worker",
                                       "--operation",
                                       active.operation,
                                       "--profile",
                                       configuration.profile,
                                       "--app-dir",
                                       configuration.appDirectory,
                                       "--image-dir",
                                       configuration.imageDirectory,
                                       "--js-dir",
                                       configuration.jsDirectory};
        worker.start(QCoreApplication::applicationFilePath(), arguments);
        worker.write(QJsonDocument(active.request).toJson(QJsonDocument::Compact));
        worker.closeWriteChannel();
        workerTimeout.start(120000);
    }
    void complete(const QString &id, const QJsonObject &result) {
        results[id] = result;
        completedIds.enqueue(id);
        while (completedIds.size() > 128)
            results.remove(completedIds.dequeue());
    }
    void finish(bool ok) {
        workerTimeout.stop();
        const QByteArray output = worker.readAllStandardOutput();
        const QByteArray errors = worker.readAllStandardError();
        QJsonObject result = QJsonDocument::fromJson(output).object();
        if (!ok || !result.contains("ok"))
            result = failure("Power-image worker failed: " + QString::fromUtf8(errors.right(1000)));
        if (cancelled)
            result = {{"ok", false}, {"cancelled", true}};
        if (active.operation == "backup" && result.value("ok").toBool())
            renderingEnabled = true;
        complete(active.id, result);
        running = false;
        startNext();
    }
};
} // namespace

int runPowerImageService(QGuiApplication &application) {
    const QStringList arguments = application.arguments();
    const QString profile = option(arguments, "--profile", "stable");
    if (profile != "stable" && profile != "test")
        return 2;
    const QString appDirectory =
        option(arguments, "--app-dir",
               "/home/root/xovi/exthome/appload/habit-tracker" + QString(profile == "test" ? "-test" : ""));
    const Configuration configuration{
        profile, appDirectory, option(arguments, "--image-dir", "/usr/share/remarkable"),
        option(arguments, "--js-dir", appDirectory + "/suspend-writer"),
        static_cast<quint16>(option(arguments, "--port", profile == "test" ? "47832" : "47831").toUShort())};
    if (arguments.contains("--worker")) {
#ifdef POWER_IMAGE_TESTING
        const QString gatePath = qEnvironmentVariable("HABIT_TRACKER_TEST_GATE");
        if (!gatePath.isEmpty()) {
            QFile gate(gatePath);
            if (!gate.open(QIODevice::ReadOnly))
                return 3;
            gate.read(1);
        }
#endif
        QFile input;
        input.open(stdin, QIODevice::ReadOnly);
        const QJsonDocument request = QJsonDocument::fromJson(input.readAll());
        const QJsonObject result = perform(configuration, option(arguments, "--operation"), request.object());
        const QByteArray output = QJsonDocument(result).toJson(QJsonDocument::Compact);
        std::fwrite(output.constData(), 1, output.size(), stdout);
        return 0;
    }
    Service service(configuration);
    if (!service.start()) {
        qCritical() << "Could not start power-image helper";
        return 1;
    }
    return application.exec();
}
