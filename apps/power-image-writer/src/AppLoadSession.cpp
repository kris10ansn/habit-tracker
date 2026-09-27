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

            submitJob(requestId, WriterProtocol::parseRequest(message, testProfile));
        } catch (const Error &error) {
            sendResult(WriterProtocol::failure(requestId, error));
        }
    }

    void AppLoadSession::submitJob(const QString &requestId, const Request &request) {
        const bool rendering = request.operation == Operation::Render;
        if (activeJob && (!rendering || activeJob->request.operation != Operation::Render)) {
            throw Error("Image writer is busy");
        }

        if (!activeJob && !imageLock.tryLock(0)) {
            throw Error("Image writer is busy");
        }

        Job job{requestId, request, {}};
        try {
            if (rendering) {
                // Every accepted render owns its saved input, even if the frontend later unloads.
                // Only capture runs here; image work stays on the worker thread.
                job.snapshot = writer.captureForRender(request);
                backgroundResults.accepted(requestId);
            }
        } catch (...) {
            if (!activeJob) {
                imageLock.unlock();
            }
            throw;
        }

        if (activeJob) {
            const auto replaced = std::exchange(pendingJob, std::move(job));
            if (replaced) {
                sendResult(WriterProtocol::failure(replaced->id, Error("Replaced by newer saved data", {}, true)));
            }
        } else {
            startJob(std::move(job));
        }

        acknowledgeAccepted(requestId);
    }

    void AppLoadSession::finishCurrentInBackground(const QString &requestId) {
        const auto &lastJob = pendingJob ? pendingJob : activeJob;
        if (lastJob && lastJob->request.operation != Operation::Render) {
            throw Error("Wait for the current image operation before closing");
        }

        // A past-month view cannot submit a new snapshot. Confirm that existing work may finish
        // after close; its outcome was already recorded when the render was accepted.
        acknowledgeAccepted(requestId);
        sendResult({{"kind", "done"}, {"id", requestId}, {"ok", true}});
    }

    void AppLoadSession::acknowledgeAccepted(const QString &requestId) {
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
