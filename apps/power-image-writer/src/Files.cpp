#include "Files.h"
#include "Model.h"

#include <QCryptographicHash>
#include <QFile>
#include <QFileInfo>
#include <QSaveFile>

namespace powerimages {
bool LocalFiles::exists(const QString &path) const {
    return QFileInfo::exists(path) || QFileInfo(path).isSymLink();
}

QByteArray LocalFiles::read(const QString &path) const {
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly)) {
        throw Error("Could not read " + path + ": " + file.errorString(), path);
    }

    const auto bytes = file.readAll();
    if (file.error() != QFileDevice::NoError) {
        throw Error("Could not read " + path, path);
    }

    return bytes;
}

void LocalFiles::write(const QString &path, const QByteArray &bytes) {
    const QFileInfo info(path);
    const auto destination = info.isSymLink() ? info.canonicalFilePath() : path;
    if (destination.isEmpty()) {
        throw Error("Refusing to replace a broken image symlink: " + path, path);
    }

    QSaveFile file(destination);
    if (!file.open(QIODevice::WriteOnly) || file.write(bytes) != bytes.size() || !file.commit()) {
        throw Error("Could not save " + path + ": " + file.errorString(), path);
    }

    if (read(path) != bytes) {
        throw Error("Readback verification failed: " + path, path);
    }
}

QString contentHash(const QByteArray &bytes) {
    if (bytes.isNull()) {
        return "missing";
    }

    return QString::fromLatin1(QCryptographicHash::hash(bytes, QCryptographicHash::Md5).toHex());
}
} // namespace powerimages
