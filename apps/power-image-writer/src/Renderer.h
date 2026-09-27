#pragma once
#include "Model.h"
#include <QImage>

namespace powerimages {
QImage renderBase(const Snapshot &snapshot);
QImage renderState(const QImage &base, State state);
QByteArray encodePng(const QImage &image);
QByteArray encodeBootImage(const QImage &portrait);
void validateBootImage(const QByteArray &bytes);
} // namespace powerimages
