#pragma once
#include <QByteArray>
#include <QString>

namespace powerimages {
class Files {
  public:
    virtual ~Files() = default;
    virtual bool exists(const QString &path) const = 0;
    virtual QByteArray read(const QString &path) const = 0;
    virtual void write(const QString &path, const QByteArray &bytes) = 0;
};
class LocalFiles final : public Files {
  public:
    bool exists(const QString &path) const override;
    QByteArray read(const QString &path) const override;
    void write(const QString &path, const QByteArray &bytes) override;
};
QString contentHash(const QByteArray &bytes);
} // namespace powerimages
