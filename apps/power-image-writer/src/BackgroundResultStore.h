#pragma once

#include "Files.h"

#include <QJsonObject>

namespace powerimages {
    class BackgroundResultStore final {
      public:
        BackgroundResultStore(Files &files, const QString &appDirectory);
        void accepted(const QString &requestId);
        void finished(const QString &requestId, const QJsonObject &result);
        void acknowledge(const QString &requestId);
        QJsonObject failure() const;

      private:
        Files &files;
        QString path;
        QString liveRequestId;
        QJsonObject savedResult;

        void save(const QJsonObject &result);
    };
} // namespace powerimages
