#pragma once

#include "Model.h"

#include <QImage>

namespace powerimages {
QImage renderBase(const Snapshot &snapshot);
QImage renderState(const QImage &base, State state);
QByteArray encodePng(const QImage &image);
QByteArray encodeBootImage(const QImage &portrait);
void validateBootImage(const QByteArray &bytes);

// One captured batch: draw the grid once and encode each distinct output once.
class RenderedImages final {
  public:
    explicit RenderedImages(Snapshot snapshot);
    QByteArray png(State state);
    QByteArray bootImage();

  private:
    Snapshot snapshot;
    QImage base;
    QMap<State, QByteArray> pngs;
    QByteArray boot;
    const QImage &baseImage();
};
} // namespace powerimages
