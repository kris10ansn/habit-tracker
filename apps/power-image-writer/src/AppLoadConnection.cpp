#include "AppLoadConnection.h"
#include "Model.h"

#include <QJsonDocument>
#include <QJsonParseError>
#include <QThread>
#include <cerrno>
#include <cstring>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>

namespace powerimages {
    namespace {
        constexpr qint32 shutdownPacket = -1;
        constexpr qint32 frontendCountPacket = -2;
        constexpr qint32 frontendCountUpdatePacket = -3;
        constexpr qint32 frontendMessagePacket = 1;
        constexpr qint32 backendMessagePacket = 2;
        constexpr quint32 maximumMessageBytes = 65536;
    } // namespace

    AppLoadConnection::Socket::Socket(const QString &path) {
        sockaddr_un address{};
        address.sun_family = AF_UNIX;
        const auto encodedSocketPath = path.toLocal8Bit();
        if (encodedSocketPath.size() >= int(sizeof(address.sun_path))) {
            throw Error("AppLoad socket path is too long");
        }

        std::memcpy(address.sun_path, encodedSocketPath.constData(), size_t(encodedSocketPath.size()));
        fileDescriptor = ::socket(AF_UNIX, SOCK_SEQPACKET | SOCK_CLOEXEC, 0);
        if (fileDescriptor < 0) {
            throw Error("Could not create AppLoad socket");
        }

        for (int attempt = 0; attempt < 100; ++attempt) {
            if (::connect(fileDescriptor, reinterpret_cast<sockaddr *>(&address), sizeof(address)) == 0) {
                return;
            }

            QThread::msleep(50);
        }

        ::close(fileDescriptor);
        fileDescriptor = -1;
        throw Error("Could not connect to AppLoad");
    }

    AppLoadConnection::Socket::~Socket() {
        if (fileDescriptor >= 0) {
            ::close(fileDescriptor);
        }
    }

    AppLoadConnection::AppLoadConnection(const QString &socketPath)
        : socket(socketPath), notifier(socket.descriptor(), QSocketNotifier::Read) {
        static_assert(sizeof(PacketHeader) == 8, "AppLoad header size");
        connect(&notifier, &QSocketNotifier::activated, this, &AppLoadConnection::receivePackets);
    }

    void AppLoadConnection::disconnectPeer() {
        if (!connected) {
            return;
        }

        connected = false;
        notifier.setEnabled(false);
        emit disconnected();
    }

    void AppLoadConnection::send(const QJsonObject &message) {
        if (!connected) {
            return;
        }

        const auto bytes = QJsonDocument(message).toJson(QJsonDocument::Compact);
        const PacketHeader header{backendMessagePacket, quint32(bytes.size())};
        // AppLoad expects two separate packets: the fixed header, then the JSON body.
        const auto headerBytesSent = ::send(socket.descriptor(), &header, sizeof(header), MSG_NOSIGNAL | MSG_DONTWAIT);
        if (headerBytesSent != sizeof(header)) {
            disconnectPeer();
            return;
        }

        const auto bodyBytesSent =
            ::send(socket.descriptor(), bytes.constData(), size_t(bytes.size()), MSG_NOSIGNAL | MSG_DONTWAIT);
        if (bodyBytesSent != bytes.size()) {
            disconnectPeer();
        }
    }

    void AppLoadConnection::receivePackets() {
        while (connected) {
            QByteArray bytes(awaitingBody ? int(pendingHeader.length) : int(sizeof(PacketHeader)), '\0');
            const auto receivedBytes =
                ::recv(socket.descriptor(), bytes.data(), size_t(bytes.size()), MSG_DONTWAIT | MSG_TRUNC);
            if (receivedBytes < 0 && errno == EINTR) {
                continue;
            }

            if (receivedBytes < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) {
                return;
            }

            if (receivedBytes != bytes.size()) {
                disconnectPeer();
                return;
            }

            if (awaitingBody) {
                awaitingBody = false;
                dispatchPacket(bytes);
                continue;
            }

            std::memcpy(&pendingHeader, bytes.constData(), sizeof(PacketHeader));
            if (pendingHeader.length == 0 || pendingHeader.length > maximumMessageBytes) {
                disconnectPeer();
                return;
            }

            awaitingBody = true;
        }
    }

    void AppLoadConnection::dispatchPacket(const QByteArray &body) {
        if (pendingHeader.type == shutdownPacket) {
            disconnectPeer();
            return;
        }

        if (pendingHeader.type == frontendCountPacket || pendingHeader.type == frontendCountUpdatePacket) {
            emit frontendAttachedChanged(body.toInt() != 0);
            return;
        }

        if (pendingHeader.type != frontendMessagePacket) {
            return;
        }

        QJsonParseError error;
        const auto document = QJsonDocument::fromJson(body, &error);
        if (error.error == QJsonParseError::NoError && document.isObject()) {
            emit messageReceived(document.object());
        }
    }
} // namespace powerimages
