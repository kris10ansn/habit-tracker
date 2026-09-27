#pragma once

#include "AppLoadConnection.h"
#include "BackgroundResultStore.h"
#include "Writer.h"

#include <QLockFile>
#include <QThread>
#include <QTimer>
#include <memory>
#include <optional>

namespace powerimages {
    class AppLoadSession final : public QObject {
      public:
        AppLoadSession(const QString &socketPath, const QString &lockPath, Environment environment);
        ~AppLoadSession() override;

      private:
        struct Job {
            QString id;
            Request request;
            std::optional<Snapshot> snapshot;
        };

        LocalFiles files;
        Writer writer;
        BackgroundResultStore backgroundResults;
        QLockFile imageLock;
        QLockFile sessionLock;
        AppLoadConnection connection;
        QTimer heartbeat;
        QTimer idleExit;
        std::unique_ptr<QThread> workerThread;
        std::optional<Job> activeJob;
        std::optional<Job> pendingJob;
        bool frontendAttached = true;
        bool testProfile;

        void handleRequest(const QJsonObject &message);
        void setFrontendAttached(bool attached);
        void acceptRenderHandoff(const QString &requestId, const Request &request);
        void finishCurrentInBackground(const QString &requestId);
        void acknowledgeHandoff(const QString &requestId);
        void startJob(Job job);
        QJsonObject executeJob(const Job &job);
        void postProgress(const QString &requestId, const ProgressEvent &progress);
        void finishJob(QJsonObject result);
        void sendResult(QJsonObject result);
    };
} // namespace powerimages
