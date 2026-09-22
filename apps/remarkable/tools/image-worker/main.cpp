#include <QGuiApplication>
#include <QQuickView>
#include <QQuickItem>
#include <QQmlContext>
#include <QResource>
#include <QSocketNotifier>
#include <QLockFile>
#include <QTimer>
#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QDebug>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cerrno>
#include <cstring>
#include <memory>

// AppLoad uses separate SOCK_SEQPACKET records for the native-endian header and UTF-8 body.
struct Header { qint32 type; quint32 length; };
static_assert(sizeof(Header) == 8, "AppLoad header size");

class ImageBridge : public QObject {
    Q_OBJECT
public:
    ImageBridge(int socket, QString lockPath) : socket(socket), lock(lockPath) {
        if (socket >= 0) {
            notifier = std::make_unique<QSocketNotifier>(socket, QSocketNotifier::Read);
            connect(notifier.get(), &QSocketNotifier::activated, this, [this] { receive(); });
        }
        lock.setStaleLockTime(0);
        idleExit.setSingleShot(true);
        idleExit.setInterval(250);
        connect(&idleExit, &QTimer::timeout, this, [] { QCoreApplication::quit(); });
    }
    ~ImageBridge() { if (socket >= 0) ::close(socket); }

    Q_INVOKABLE bool acquire() {
        if (working || !lock.tryLock(0)) return false;
        working = true;
        idleExit.stop();
        return true;
    }
    Q_INVOKABLE void release() {
        lock.unlock();
        working = false;
        if (detached) idleExit.start();
    }
    Q_INVOKABLE void reply(const QString &body) {
        if (disconnected) return;
        const QByteArray bytes = body.toUtf8();
        const Header header{2, quint32(bytes.size())};
        if (::send(socket, &header, sizeof(header), MSG_NOSIGNAL) != sizeof(header) ||
            ::send(socket, bytes.constData(), bytes.size(), MSG_NOSIGNAL) != bytes.size()) disconnectPeer();
    }
signals:
    void message(QString body);
private:
    int socket;
    QLockFile lock;
    std::unique_ptr<QSocketNotifier> notifier;
    QTimer idleExit;
    Header pending{};
    bool awaitingBody = false;
    bool detached = false;
    bool disconnected = false;
    bool working = false;

    void disconnectPeer() {
        disconnected = detached = true;
        if (notifier) notifier->setEnabled(false);
        if (!working) idleExit.start();
    }
    void dispatch(const QByteArray &bytes) {
        const QString body = QString::fromUtf8(bytes);
        if (pending.type == -1) { disconnectPeer(); return; }
        if (pending.type == -2 || pending.type == -3) {
            detached = body.toInt() == 0;
            if (!detached) idleExit.stop();
            else if (!working) idleExit.start();
            return;
        }
        if (pending.type == 1) emit message(body);
    }
    void receive() {
        while (!disconnected) {
            QByteArray bytes(awaitingBody ? int(pending.length) : int(sizeof(Header)), '\0');
            const ssize_t count = ::recv(socket, bytes.data(), bytes.size(), MSG_DONTWAIT | MSG_TRUNC);
            if (count < 0 && errno == EINTR) continue;
            if (count < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) return;
            if (count != bytes.size()) { disconnectPeer(); return; }
            if (awaitingBody) {
                awaitingBody = false;
                dispatch(bytes);
                continue;
            }
            std::memcpy(&pending, bytes.constData(), sizeof(Header));
            if (pending.length == 0 || pending.length > 65536) { disconnectPeer(); return; }
            awaitingBody = true;
        }
    }
};

int connectSocket(const char *path) {
    sockaddr_un address{};
    address.sun_family = AF_UNIX;
    if (std::strlen(path) >= sizeof(address.sun_path)) return -1;
    std::strcpy(address.sun_path, path);
    const int socket = ::socket(AF_UNIX, SOCK_SEQPACKET | SOCK_CLOEXEC, 0);
    if (socket < 0) return -1;
    bool connected = false;
    for (int attempt = 0; attempt < 100 && !connected; ++attempt) {
        connected = ::connect(socket, reinterpret_cast<sockaddr *>(&address), sizeof(address)) == 0;
        if (!connected) ::usleep(50000);
    }
    if (!connected) { ::close(socket); return -1; }
    return socket;
}

int main(int argc, char **argv) {
    qputenv("QT_QPA_PLATFORM", "offscreen");
    qputenv("QT_QUICK_BACKEND", "software");
    qputenv("QML_XHR_ALLOW_FILE_READ", "1");
    qputenv("QML_XHR_ALLOW_FILE_WRITE", "1");
    // Give xochitl priority on the tablet's single CPU.
    ::nice(10);
    QGuiApplication app(argc, argv);
#ifdef IMAGE_WORKER_HOST_TEST
    const int maximumArguments = 5;
#else
    const int maximumArguments = 4;
#endif
    if (argc < 2 || argc > maximumArguments) {
        qCritical() << "usage: image-worker <appload-socket|--check-runtime> [resources.rcc] [lock-file]";
        return 2;
    }
    const bool checkRuntime = QString::fromLocal8Bit(argv[1]) == "--check-runtime";
    const int socket = checkRuntime ? -1 : connectSocket(argv[1]);
    if (!checkRuntime && socket < 0) return 1;
    const QString resourcePath = argc >= 3 ? argv[2] : "resources.rcc";
    if (!QResource::registerResource(resourcePath)) { ::close(socket); return 1; }
    ImageBridge bridge(socket, argc >= 4 ? argv[3] : "/tmp/habit-tracker-power-images.lock");
    QVariantMap configuration;
#ifdef IMAGE_WORKER_HOST_TEST
    if (argc == 5) {
        QFile file(argv[4]);
        if (!file.open(QIODevice::ReadOnly)) return 2;
        const QJsonDocument document = QJsonDocument::fromJson(file.readAll());
        if (!document.isObject()) return 2;
        configuration = document.object().toVariantMap();
    }
#endif
    QQuickView view;
    view.rootContext()->setContextProperty("ImageWorkerConfiguration", configuration);
    view.rootContext()->setContextProperty("ImageBridge", &bridge);
    view.setSource(QUrl("qrc:/src/worker/PowerImageWorker.qml"));
    if (view.status() == QQuickView::Error) return 1;
    view.resize(1, 1);
    view.show();
    QTimer runtimePoll;
    if (checkRuntime) {
        QObject::connect(&runtimePoll, &QTimer::timeout, &app, [&] {
            if (!view.rootObject()->property("ready").toBool()) return;
            qInfo() << "Power-image worker runtime ready; Qt" << qVersion();
            app.exit(0);
        });
        runtimePoll.start(20);
        QTimer::singleShot(5000, &app, [&] {
            qCritical() << "Power-image worker runtime did not become ready";
            app.exit(1);
        });
    }
    return app.exec();
}
#include "main.moc"
