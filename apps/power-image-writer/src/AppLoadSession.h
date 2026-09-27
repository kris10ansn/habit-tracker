#pragma once

#include "AppLoadConnection.h"
#include "Writer.h"
#include <QLockFile>
#include <QThread>
#include <QTimer>
#include <memory>

namespace powerimages {

class AppLoadSession final : public QObject {
  public:
    AppLoadSession(const QString &socketPath, const QString &lockPath, Environment environment);
    ~AppLoadSession() override;

  private:
    LocalFiles files;
    Writer writer;
    QLockFile imageLock;
    QLockFile sessionLock;
    AppLoadConnection connection;
    QTimer heartbeat;
    QTimer idleExit;
    std::unique_ptr<QThread> workerThread;
    QString activeRequestId;
    bool frontendAttached = true;
    bool testProfile;

    void handleRequest(const QJsonObject &message);
    void setFrontendAttached(bool attached);
    void startJob(const QString &requestId, const Request &request);
    QJsonObject executeJob(const QString &requestId, const Request &request);
    void finishJob(const QJsonObject &result);
    void postProgress(const QString &requestId, const ProgressEvent &progress);
};
} // namespace powerimages
