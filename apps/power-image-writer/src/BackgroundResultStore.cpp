#include "BackgroundResultStore.h"

#include <QJsonDocument>
#include <QJsonParseError>

namespace powerimages {
    BackgroundResultStore::BackgroundResultStore(Files &files, const QString &appDirectory)
        : files(files), path(appDirectory + "/power-image-result.json") {
        if (!files.exists(path)) {
            return;
        }

        QJsonParseError parseError;
        const auto document = QJsonDocument::fromJson(files.read(path), &parseError);
        savedResult = document.object();
        const bool validResult =
            savedResult.isEmpty() ||
            (savedResult["id"].isString() && (savedResult["ok"].isBool() || savedResult["pending"].toBool()));
        if (parseError.error == QJsonParseError::NoError && document.isObject() && validResult) {
            return;
        }

        savedResult = {
            {"id", "unreadable"}, {"ok", false}, {"error", "Could not read the previous background image result"}};
    }

    void BackgroundResultStore::save(const QJsonObject &result) {
        files.write(path, QJsonDocument(result).toJson(QJsonDocument::Compact));
        savedResult = result;
    }

    void BackgroundResultStore::accepted(const QString &requestId) {
        save({{"id", requestId}, {"pending", true}});
        liveRequestId = requestId;
    }

    void BackgroundResultStore::finished(const QString &requestId, const QJsonObject &result) {
        if (savedResult["id"].toString() != requestId) {
            return;
        }

        liveRequestId.clear();
        save(result);
    }

    void BackgroundResultStore::acknowledge(const QString &requestId) {
        if (savedResult["id"].toString() == requestId && liveRequestId.isEmpty()) {
            save({});
        }
    }

    QJsonObject BackgroundResultStore::failure() const {
        if (savedResult.isEmpty() || savedResult["ok"].toBool() || !liveRequestId.isEmpty()) {
            return {};
        }

        if (savedResult["pending"].toBool()) {
            return {{"id", savedResult["id"]},
                    {"ok", false},
                    {"error", "The previous background image save did not finish. Images may be out of date."}};
        }

        return savedResult;
    }
} // namespace powerimages
