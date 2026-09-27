#include "AppLoad.h"
#include <QCoreApplication>
#include <QJsonDocument>
#include <QJsonParseError>
#include <QMetaObject>
#include <QRegularExpression>
#include <cerrno>
#include <cstring>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>

namespace powerimages {
Socket::Socket(const QString &path) {
    sockaddr_un address{};
    address.sun_family = AF_UNIX;
    const auto encoded = path.toLocal8Bit();
    if (encoded.size() >= int(sizeof(address.sun_path)))
        throw Error("AppLoad socket path is too long");
    std::memcpy(address.sun_path, encoded.constData(), size_t(encoded.size()));
    value = ::socket(AF_UNIX, SOCK_SEQPACKET | SOCK_CLOEXEC, 0);
    if (value < 0)
        throw Error("Could not create AppLoad socket");
    for (int attempt = 0; attempt < 100; ++attempt) {
        if (::connect(value, reinterpret_cast<sockaddr *>(&address), sizeof(address)) == 0)
            return;
        QThread::msleep(50);
    }
    ::close(value);
    value = -1;
    throw Error("Could not connect to AppLoad");
}
Socket::~Socket() {
    if (value >= 0)
        ::close(value);
}

AppLoad::AppLoad(const QString &socketPath, const QString &lockPath, Environment environment)
    : socket(socketPath), writer(files, environment), imageLock(lockPath),
      sessionLock(environment.appDirectory + "/.writer-session.lock"),
      notifier(socket.descriptor(), QSocketNotifier::Read), testProfile(environment.testProfile) {
    static_assert(sizeof(Header) == 8, "AppLoad header size");
    imageLock.setStaleLockTime(0);
    sessionLock.setStaleLockTime(0);
    if (!sessionLock.tryLock(0))
        throw Error("A standalone command or app session is already using this data directory");
    connect(&notifier, &QSocketNotifier::activated, this, [this] { receive(); });
    heartbeat.setInterval(1000);
    connect(&heartbeat, &QTimer::timeout, this, [this] { send({{"kind", "heartbeat"}, {"id", requestId}}); });
    idleExit.setSingleShot(true);
    idleExit.setInterval(250);
    connect(&idleExit, &QTimer::timeout, this, [] { QCoreApplication::quit(); });
}
AppLoad::~AppLoad() {
    if (thread)
        thread->wait();
}

void AppLoad::disconnectPeer() {
    disconnected = detached = true;
    notifier.setEnabled(false);
    if (requestId.isEmpty())
        idleExit.start();
}
void AppLoad::send(QJsonObject message) {
    if (disconnected)
        return;
    const auto bytes = QJsonDocument(message).toJson(QJsonDocument::Compact);
    const Header header{2, quint32(bytes.size())};
    if (::send(socket.descriptor(), &header, sizeof(header), MSG_NOSIGNAL | MSG_DONTWAIT) != sizeof(header) ||
        ::send(socket.descriptor(), bytes.constData(), size_t(bytes.size()), MSG_NOSIGNAL | MSG_DONTWAIT) !=
            bytes.size())
        disconnectPeer();
}
void AppLoad::receive() {
    while (!disconnected) {
        QByteArray bytes(awaitingBody ? int(pending.length) : int(sizeof(Header)), '\0');
        const auto count = ::recv(socket.descriptor(), bytes.data(), size_t(bytes.size()), MSG_DONTWAIT | MSG_TRUNC);
        if (count < 0 && errno == EINTR)
            continue;
        if (count < 0 && (errno == EAGAIN || errno == EWOULDBLOCK))
            return;
        if (count != bytes.size()) {
            disconnectPeer();
            return;
        }
        if (awaitingBody) {
            awaitingBody = false;
            dispatch(bytes);
            continue;
        }
        std::memcpy(&pending, bytes.constData(), sizeof(Header));
        if (pending.length == 0 || pending.length > 65536) {
            disconnectPeer();
            return;
        }
        awaitingBody = true;
    }
}
void AppLoad::dispatch(const QByteArray &body) {
    if (pending.type == -1) {
        disconnectPeer();
        return;
    }
    if (pending.type == -2 || pending.type == -3) {
        detached = body.toInt() == 0;
        if (!detached)
            idleExit.stop();
        else if (requestId.isEmpty())
            idleExit.start();
        return;
    }
    if (pending.type != 1)
        return;
    QJsonParseError error;
    const auto message = QJsonDocument::fromJson(body, &error);
    if (error.error == QJsonParseError::NoError && message.isObject())
        request(message.object());
}
void AppLoad::request(const QJsonObject &message) {
    if (message["operation"] == "hello") {
        send({{"version", 2}, {"kind", "ready"}, {"ready", true}, {"busy", !requestId.isEmpty()}});
        return;
    }
    const auto id = message["id"].toString();
    try {
        if (message["version"].toInt() != 2 || id.isEmpty() || id.size() > 100)
            throw Error("Unsupported image request");
        const auto operation = parseOperation(message["operation"].toString());
        if (isDeveloper(operation) && !testProfile)
            throw Error("Unsupported image operation");
        Request parsed{operation, {}, {}};
        if (requiresData(operation)) {
            parsed.date = parseDate(message["date"].toString());
            parsed.expected = message["expected"].toObject();
            const QRegularExpression digest("^[0-9a-f]{32}$");
            if (!digest.match(parsed.expected["roster"].toString()).hasMatch() ||
                (parsed.expected["month"] != "missing" &&
                 !digest.match(parsed.expected["month"].toString()).hasMatch()))
                throw Error("A confirmed saved-data fingerprint is required");
        }
        if (!requestId.isEmpty() || !imageLock.tryLock(0))
            throw Error("Image writer is busy");
        start(message, parsed);
    } catch (const Error &error) {
        send({{"kind", "done"}, {"id", id}, {"ok", false}, {"error", QString::fromUtf8(error.what())}});
    }
}
void AppLoad::start(const QJsonObject &message, const Request &request) {
    requestId = message["id"].toString();
    const auto id = requestId;
    idleExit.stop();
    heartbeat.start();
    thread = std::unique_ptr<QThread>(QThread::create([this, id, request] {
        QJsonObject result;
        try {
            result = writer.execute(request, [this, id](QJsonObject progress) {
                progress["id"] = id;
                QMetaObject::invokeMethod(this, [this, progress] { send(progress); }, Qt::QueuedConnection);
            });
        } catch (const Error &error) {
            result = {{"ok", false},
                      {"error", QString::fromUtf8(error.what())},
                      {"path", error.path},
                      {"superseded", error.superseded}};
        } catch (const std::exception &error) {
            result = {{"ok", false}, {"error", QString::fromUtf8(error.what())}};
        }
        result["kind"] = "done";
        result["id"] = id;
        QMetaObject::invokeMethod(
            this,
            [this, result] {
                thread->wait();
                thread.reset();
                imageLock.unlock();
                heartbeat.stop();
                requestId.clear();
                send(result);
                if (detached)
                    idleExit.start();
            },
            Qt::QueuedConnection);
    }));
    thread->start();
}
} // namespace powerimages
