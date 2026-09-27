#pragma once
#include "Writer.h"
#include <QJsonObject>
#include <QLockFile>
#include <QObject>
#include <QSocketNotifier>
#include <QThread>
#include <QTimer>
#include <memory>

namespace powerimages {
class Socket final {
  public:
    explicit Socket(const QString &path);
    ~Socket();
    Socket(const Socket &) = delete;
    Socket &operator=(const Socket &) = delete;
    int descriptor() const {
        return value;
    }

  private:
    int value = -1;
};

class AppLoad final : public QObject {
  public:
    AppLoad(const QString &socketPath, const QString &lockPath, Environment environment);
    ~AppLoad() override;

  private:
    struct Header {
        qint32 type;
        quint32 length;
    };
    Socket socket;
    LocalFiles files;
    Writer writer;
    QLockFile imageLock;
    QLockFile sessionLock;
    QSocketNotifier notifier;
    QTimer heartbeat;
    QTimer idleExit;
    std::unique_ptr<QThread> thread;
    Header pending{};
    QString requestId;
    bool awaitingBody = false;
    bool disconnected = false;
    bool detached = false;
    bool testProfile;
    void receive();
    void dispatch(const QByteArray &body);
    void request(const QJsonObject &request);
    void send(QJsonObject message);
    void disconnectPeer();
    void start(const QJsonObject &message, const Request &request);
};
} // namespace powerimages
