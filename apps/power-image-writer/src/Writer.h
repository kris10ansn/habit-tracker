#pragma once

#include "Files.h"
#include "Model.h"

#include <functional>
#include <optional>

namespace powerimages {

class RenderedImages;

struct Environment {
    QString appDirectory;
    QString imageDirectory = "/usr/share/remarkable";
    QString bootDirectory = "/var/lib/uboot";
    QString deviceModel;
    bool testProfile = false;
};

struct ImageTarget {
    State state;
    QString path;
    QString backupPath;
    bool isBootImage = false;
    bool isOptional = false;
};
enum class Operation { Render, Backup, Restore, Preview, WriteOne, WriteAll, RestoreOne, RestoreAll };
bool isDeveloper(Operation operation);
bool requiresData(Operation operation);
bool isRestore(Operation operation);

struct SavedDataFingerprint {
    QString roster;
    QString month;
};

struct Request {
    Operation operation;
    QDate date;
    std::optional<SavedDataFingerprint> expected;
};
enum class ProgressPhase { Captured, BackingUp, Saving, Restoring };

struct ProgressEvent {
    ProgressPhase phase;
    QString path;
    std::optional<int> remainingImages;
};

using ProgressCallback = std::function<void(const ProgressEvent &)>;

class Writer final {
  public:
    Writer(Files &files, Environment environment);
    void execute(const Request &request, const ProgressCallback &progress);
    Snapshot capture(const QDate &date, const std::optional<SavedDataFingerprint> &expected = std::nullopt) const;

  private:
    Files &files;
    Environment environment;
    QByteArray lastSignature;
    QVector<ImageTarget> targets(Operation operation) const;
    void validateBootTargets(const QVector<ImageTarget> &selected, bool restoring) const;
    void backup(const QVector<ImageTarget> &selected, const ProgressCallback &progress);
    void restore(const QVector<ImageTarget> &selected, const ProgressCallback &progress);
    void render(const QVector<ImageTarget> &selected, const Snapshot &snapshot, const ProgressCallback &progress,
                bool deduplicate);

    struct Settings {
        bool writingEnabled = false;
        bool restorationPending = false;
    };

    void writeDeveloperPreviews(const QVector<ImageTarget> &selected, RenderedImages &images);
    void requireWritingEnabled() const;
    Settings settings() const;
    QString signaturePath() const;
};
} // namespace powerimages
