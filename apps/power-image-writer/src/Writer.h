#pragma once
#include "Files.h"
#include "Model.h"
#include <QJsonObject>
#include <functional>

namespace powerimages {
struct Environment {
    QString appDirectory;
    QString imageDirectory = "/usr/share/remarkable";
    QString bootDirectory = "/var/lib/uboot";
    QString deviceModel;
    bool testProfile = false;
};
struct Target {
    State state;
    QString path;
    QString backup;
    bool boot = false;
    bool optional = false;
};
enum class Operation { Render, Backup, Restore, Preview, WriteOne, WriteAll, RestoreOne, RestoreAll };
Operation parseOperation(const QString &name);
bool isDeveloper(Operation operation);
bool requiresData(Operation operation);
bool isRestore(Operation operation);

struct Request {
    Operation operation;
    QDate date;
    QJsonObject expected;
};
using Progress = std::function<void(const QJsonObject &)>;

class Writer final {
  public:
    Writer(Files &files, Environment environment);
    QJsonObject execute(const Request &request, const Progress &progress);
    Snapshot capture(const QDate &date, const QJsonObject &expected = {}) const;

  private:
    Files &files;
    Environment environment;
    QByteArray lastSignature;
    QVector<Target> targets(bool developer, bool single) const;
    void validateBootTargets(const QVector<Target> &selected, bool restoring) const;
    void backup(const QVector<Target> &selected, const Progress &progress);
    void restore(const QVector<Target> &selected, const Progress &progress);
    void render(const QVector<Target> &selected, const Snapshot &snapshot, const Progress &progress, bool deduplicate);
    QJsonObject settings() const;
    QString signaturePath() const;
};
} // namespace powerimages
