#include "AppLoadSession.h"
#include "WriterProtocol.h"

#include <QCoreApplication>
#include <QMetaObject>

namespace powerimages {

AppLoadSession::AppLoadSession(const QString &socketPath, const QString &lockPath, Environment environment)
    : writer(files, environment), imageLock(lockPath), sessionLock(environment.appDirectory + "/.writer-session.lock"),
      connection(socketPath), testProfile(environment.testProfile) {
    imageLock.setStaleLockTime(0);
    sessionLock.setStaleLockTime(0);
    if (!sessionLock.tryLock(0)) {
        throw Error("A standalone command or app session is already using this data directory");
    }

    connect(&connection, &AppLoadConnection::messageReceived, this, &AppLoadSession::handleRequest);
    connect(&connection, &AppLoadConnection::frontendAttachedChanged, this, &AppLoadSession::setFrontendAttached);
    connect(&connection, &AppLoadConnection::disconnected, this, [this] { setFrontendAttached(false); });

    heartbeat.setInterval(1000);
    connect(&heartbeat, &QTimer::timeout, this,
            [this] { connection.send({{"kind", "heartbeat"}, {"id", activeRequestId}}); });

    idleExit.setSingleShot(true);
    idleExit.setInterval(250);
    connect(&idleExit, &QTimer::timeout, this, [] { QCoreApplication::quit(); });
}

AppLoadSession::~AppLoadSession() {
    // The job owns accepted work even when its frontend disappears.
    if (workerThread) {
        workerThread->wait();
    }
}

void AppLoadSession::setFrontendAttached(bool attached) {
    frontendAttached = attached;
    if (attached) {
        idleExit.stop();
        return;
    }

    if (activeRequestId.isEmpty()) {
        idleExit.start();
    }
}

void AppLoadSession::handleRequest(const QJsonObject &message) {
    if (message["operation"] == "hello") {
        connection.send({{"version", WriterProtocol::version},
                         {"kind", "ready"},
                         {"ready", true},
                         {"busy", !activeRequestId.isEmpty()}});
        return;
    }

    const auto requestId = message["id"].toString();
    try {
        const auto request = WriterProtocol::parseRequest(message, testProfile);
        if (!activeRequestId.isEmpty() || !imageLock.tryLock(0)) {
            throw Error("Image writer is busy");
        }

        startJob(requestId, request);
    } catch (const Error &error) {
        connection.send(WriterProtocol::failure(requestId, error));
    }
}

void AppLoadSession::startJob(const QString &requestId, const Request &request) {
    activeRequestId = requestId;
    idleExit.stop();
    heartbeat.start();

    workerThread.reset(QThread::create([this, requestId, request] {
        const auto result = executeJob(requestId, request);
        QMetaObject::invokeMethod(this, [this, result] { finishJob(result); }, Qt::QueuedConnection);
    }));
    workerThread->start();
}

QJsonObject AppLoadSession::executeJob(const QString &requestId, const Request &request) {
    try {
        writer.execute(request,
                       [this, requestId](const ProgressEvent &progress) { postProgress(requestId, progress); });
        return WriterProtocol::success(requestId, request.operation);
    } catch (const Error &error) {
        return WriterProtocol::failure(requestId, error);
    } catch (const std::exception &error) {
        return WriterProtocol::failure(requestId, Error(QString::fromUtf8(error.what())));
    }
}

void AppLoadSession::postProgress(const QString &requestId, const ProgressEvent &progress) {
    const auto message = WriterProtocol::progressMessage(progress, requestId);
    // Socket I/O stays on the event-loop thread; image work stays on the worker thread.
    QMetaObject::invokeMethod(this, [this, message] { connection.send(message); }, Qt::QueuedConnection);
}

void AppLoadSession::finishJob(const QJsonObject &result) {
    workerThread->wait();
    workerThread.reset();

    imageLock.unlock();
    heartbeat.stop();
    activeRequestId.clear();

    connection.send(result);
    if (!frontendAttached) {
        idleExit.start();
    }
}
} // namespace powerimages
