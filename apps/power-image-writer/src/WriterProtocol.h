#pragma once

#include "Writer.h"
#include <QJsonObject>

namespace powerimages::WriterProtocol {
constexpr int version = 2;
Operation parseOperation(const QString &name);
Request parseRequest(const QJsonObject &message, bool testProfile);
QJsonObject progressMessage(const ProgressEvent &progress, const QString &requestId = {});
QJsonObject success(const QString &requestId, Operation operation);
QJsonObject failure(const QString &requestId, const Error &error);
} // namespace powerimages::WriterProtocol
