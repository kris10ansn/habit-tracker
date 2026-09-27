#include "WriterProtocol.h"
#include <QRegularExpression>

namespace powerimages::WriterProtocol {
Operation parseOperation(const QString &name) {
    static const QMap<QString, Operation> operations{{"render", Operation::Render},
                                                     {"backup", Operation::Backup},
                                                     {"restore", Operation::Restore},
                                                     {"developer-preview", Operation::Preview},
                                                     {"developer-write", Operation::WriteOne},
                                                     {"developer-write-all", Operation::WriteAll},
                                                     {"developer-restore", Operation::RestoreOne},
                                                     {"developer-restore-all", Operation::RestoreAll}};
    const auto found = operations.constFind(name);
    if (found == operations.cend())
        throw Error("Unknown image operation: " + name);
    return found.value();
}

Request parseRequest(const QJsonObject &message, bool testProfile) {
    const auto requestId = message["id"].toString();
    if (message["version"].toInt() != version || requestId.isEmpty() || requestId.size() > 100)
        throw Error("Unsupported image request");
    const auto operation = parseOperation(message["operation"].toString());
    if (isDeveloper(operation) && !testProfile)
        throw Error("Unsupported image operation");
    Request request{operation, {}, {}};
    if (!requiresData(operation))
        return request;

    request.date = parseDate(message["date"].toString());
    const auto expected = message["expected"].toObject();
    const SavedDataFingerprint fingerprint{expected["roster"].toString(), expected["month"].toString()};
    static const QRegularExpression digest("^[0-9a-f]{32}$");
    if (!digest.match(fingerprint.roster).hasMatch() ||
        (fingerprint.month != "missing" && !digest.match(fingerprint.month).hasMatch()))
        throw Error("A confirmed saved-data fingerprint is required");
    request.expected = fingerprint;
    return request;
}

QJsonObject progressMessage(const ProgressEvent &progress, const QString &requestId) {
    if (progress.phase == ProgressPhase::Captured)
        return {{"kind", "captured"}, {"id", requestId}};
    QString phase;
    switch (progress.phase) {
    case ProgressPhase::BackingUp:
        phase = "backing-up";
        break;
    case ProgressPhase::Saving:
        phase = "saving";
        break;
    case ProgressPhase::Restoring:
        phase = "restoring";
        break;
    case ProgressPhase::Captured:
        break;
    }
    QJsonObject message{{"kind", "progress"}, {"id", requestId}, {"phase", phase}, {"message", progress.path}};
    if (progress.remainingImages)
        message["imageProgress"] = QJsonObject{{"path", progress.path}, {"remainingImages", *progress.remainingImages}};
    return message;
}

QJsonObject success(const QString &requestId, Operation operation) {
    QJsonObject message{{"kind", "done"}, {"id", requestId}, {"ok", true}};
    if (requiresData(operation))
        message["message"] = "Power-state images saved";
    return message;
}

QJsonObject failure(const QString &requestId, const Error &error) {
    return {{"kind", "done"},     {"id", requestId},
            {"ok", false},        {"error", QString::fromUtf8(error.what())},
            {"path", error.path}, {"superseded", error.superseded}};
}
} // namespace powerimages::WriterProtocol
