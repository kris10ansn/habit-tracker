#include "AppLoadSession.h"
#include "WriterProtocol.h"

#include <QCoreApplication>
#include <QMetaObject>
#include <utility>

namespace powerimages {
    AppLoadSession::AppLoadSession(const QString &socketPath, const QString &lockPath, Environment environment)
        : writer(files, environment), backgroundResults(files, environment.appDirectory), imageLock(lockPath),
          sessionLock(environment.appDirectory + "/.writer-session.lock"), connection(socketPath),
          testProfile(environment.testProfile) {
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
                [this] { connection.send({{"kind", "heartbeat"}, {"id", activeJob ? activeJob->id : QString()}}); });

        idleExit.setSingleShot(true);
        idleExit.setInterval(250);
        connect(&idleExit, &QTimer::timeout, this, [] { QCoreApplication::quit(); });
    }

    AppLoadSession::~AppLoadSession() {
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

        if (!activeJob) {
            idleExit.start();
        }
    }

    void AppLoadSession::handleRequest(const QJsonObject &message) {
        if (message["operation"] == "hello") {
            setFrontendAttached(true);
            sendResult({{"version", WriterProtocol::version}, {"kind", "ready"}, {"ready", true}});
            return;
        }

        const auto requestId = message["id"].toString();
        try {
            WriterProtocol::requestId(message);
            if (message["operation"] == "acknowledge-background") {
                backgroundResults.acknowledge(message["resultId"].toString());
                return;
            }

            if (message["operation"] == "finish-background") {
                finishCurrentInBackground(requestId);
                return;
            }

            const auto request = WriterProtocol::parseRequest(message, testProfile);
            if (message["handoff"].toBool()) {
                acceptRenderHandoff(requestId, request);
                return;
            }

            if (activeJob || !imageLock.tryLock(0)) {
                throw Error("Image writer is busy");
            }

            startJob({requestId, request, {}});
        } catch (const Error &error) {
            sendResult(WriterProtocol::failure(requestId, error));
        }
    }

    void AppLoadSession::acceptRenderHandoff(const QString &requestId, const Request &request) {
        if (activeJob && activeJob->request.operation != Operation::Render) {
            throw Error("Wait for the current image operation before closing");
        }

        if (!activeJob && !imageLock.tryLock(0)) {
            throw Error("Image writer is busy");
        }

        Job job{requestId, request, {}};
        try {
            // Only saved-data capture runs here; rendering stays on the worker thread.
            // The accepted snapshot must survive later edits in a reopened frontend.
            job.snapshot = writer.captureForRender(request);
            backgroundResults.accepted(requestId);
        } catch (...) {
            if (!activeJob) {
                imageLock.unlock();
            }
            throw;
        }

        if (!activeJob) {
            startJob(std::move(job));
            acknowledgeHandoff(requestId);
            return;
        }

        const auto replaced = pendingJob;
        pendingJob = std::move(job);
        if (replaced) {
            sendResult(WriterProtocol::failure(replaced->id, Error("Replaced by newer saved data", {}, true)));
        }

        acknowledgeHandoff(requestId);
    }

    void AppLoadSession::finishCurrentInBackground(const QString &requestId) {
        const auto &lastJob = pendingJob ? pendingJob : activeJob;
        if (!lastJob) {
            acknowledgeHandoff(requestId);
            return;
        }

        if (lastJob->request.operation != Operation::Render) {
            throw Error("Wait for the current image operation before closing");
        }

        backgroundResults.accepted(lastJob->id);
        acknowledgeHandoff(requestId);
    }

    void AppLoadSession::acknowledgeHandoff(const QString &requestId) {
        sendResult({{"kind", "accepted"}, {"id", requestId}, {"ok", true}});
    }

    void AppLoadSession::startJob(Job job) {
        activeJob = job;
        idleExit.stop();
        heartbeat.start();

        workerThread.reset(QThread::create([this, job = std::move(job)] {
            const auto result = executeJob(job);
            QMetaObject::invokeMethod(this, [this, result] { finishJob(result); }, Qt::QueuedConnection);
        }));
        workerThread->start();
    }

    QJsonObject AppLoadSession::executeJob(const Job &job) {
        try {
            const auto progress = [this, &job](const ProgressEvent &event) { postProgress(job.id, event); };
            if (job.snapshot) {
                writer.renderCaptured(*job.snapshot, progress);
            } else {
                writer.execute(job.request, progress);
            }

            return WriterProtocol::success(job.id, job.request.operation);
        } catch (const Error &error) {
            return WriterProtocol::failure(job.id, error);
        } catch (const std::exception &error) {
            return WriterProtocol::failure(job.id, Error(QString::fromUtf8(error.what())));
        }
    }

    void AppLoadSession::postProgress(const QString &requestId, const ProgressEvent &progress) {
        const auto message = WriterProtocol::progressMessage(progress, requestId);
        QMetaObject::invokeMethod(this, [this, message] { connection.send(message); }, Qt::QueuedConnection);
    }

    void AppLoadSession::finishJob(QJsonObject result) {
        workerThread->wait();
        workerThread.reset();

        try {
            backgroundResults.finished(activeJob->id, result);
        } catch (const Error &error) {
            result = WriterProtocol::failure(activeJob->id, error);
        }

        activeJob.reset();
        if (pendingJob) {
            auto next = std::move(*pendingJob);
            pendingJob.reset();
            startJob(std::move(next));
        } else {
            imageLock.unlock();
            heartbeat.stop();
        }

        sendResult(std::move(result));
        if (!frontendAttached && !activeJob) {
            idleExit.start();
        }
    }

    void AppLoadSession::sendResult(QJsonObject result) {
        result["busy"] = activeJob.has_value();
        result["backgroundFailure"] = backgroundResults.failure();
        connection.send(result);
    }
} // namespace powerimages
