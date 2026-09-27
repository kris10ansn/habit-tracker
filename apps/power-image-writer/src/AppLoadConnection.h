#pragma once

#include <QJsonObject>
#include <QObject>
#include <QSocketNotifier>

namespace powerimages {

// AppLoad uses Unix sequenced-packet sockets rather than a byte-stream socket.
class AppLoadConnection final : public QObject {
    Q_OBJECT

  public:
    explicit AppLoadConnection(const QString &socketPath);
    void send(const QJsonObject &message);

  signals:
    void messageReceived(const QJsonObject &message);
    void frontendAttachedChanged(bool attached);
    void disconnected();

  private:
    class Socket final {
      public:
        explicit Socket(const QString &path);
        ~Socket();
        Socket(const Socket &) = delete;
        Socket &operator=(const Socket &) = delete;

        int descriptor() const {
            return fileDescriptor;
        }

      private:
        int fileDescriptor = -1;
    };

    struct PacketHeader {
        qint32 type;
        quint32 length;
    };

    Socket socket;
    QSocketNotifier notifier;
    PacketHeader pendingHeader{};
    bool awaitingBody = false;
    bool connected = true;

    void receivePackets();
    void dispatchPacket(const QByteArray &body);
    void disconnectPeer();
};
} // namespace powerimages
