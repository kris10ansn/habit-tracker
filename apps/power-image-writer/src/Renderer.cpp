#include "Renderer.h"

#include <QBuffer>
#include <QFontMetricsF>
#include <QLocale>
#include <QPainter>
#include <QPainterPath>
#include <QtEndian>
#include <algorithm>
#include <cmath>
#include <utility>

namespace powerimages {
namespace {
constexpr int portraitWidth = 1404;
constexpr int portraitHeight = 1872;
constexpr int bootOffset = 54 + 256 * 4;
constexpr int bootSize = bootOffset + portraitWidth * portraitHeight;
constexpr double pi = 3.14159265358979323846;

void configureLandscapePainter(QPainter &painter) {
    painter.setRenderHint(QPainter::Antialiasing);
    painter.setRenderHint(QPainter::TextAntialiasing);
    painter.translate(portraitWidth, 0);
    painter.rotate(90);
}

QFont createFont(double size, const QString &family = "sans-serif") {
    QFont result(family);
    result.setPixelSize(std::max(1, static_cast<int>(size)));
    return result;
}

void drawText(QPainter &painter, const QString &value, double x, double y, double size,
              const QString &family = "sans-serif", Qt::Alignment alignment = Qt::AlignLeft,
              const QColor &color = QColor("#111111")) {
    painter.setFont(createFont(size, family));
    painter.setPen(color);

    const QFontMetricsF metrics(painter.font());
    const auto width = metrics.horizontalAdvance(value);
    if (alignment == Qt::AlignRight) {
        x -= width;
    }

    if (alignment == Qt::AlignHCenter) {
        x -= width / 2;
    }

    painter.drawText(QPointF(x, y + (metrics.ascent() - metrics.descent()) / 2), value);
}

void drawLine(QPainter &painter, double x1, double y1, double x2, double y2, const QColor &color = QColor("#777777"),
              double width = 1.6) {
    QPen pen(color);
    pen.setWidthF(width);
    pen.setCapStyle(Qt::FlatCap);
    painter.setPen(pen);
    painter.drawLine(QPointF(x1, y1), QPointF(x2, y2));
}

QPolygonF arcPoints(double x, double y, double radius, double start, double end) {
    QPolygonF points;
    for (int index = 0; index <= 48; ++index) {
        const auto angle = start + (end - start) * index / 48;
        points.append(QPointF(x + std::cos(angle) * radius, y + std::sin(angle) * radius));
    }

    return points;
}

void drawStateIcon(QPainter &painter, State state, double x, double y, const QColor &color) {
    painter.save();
    painter.translate(x, y);
    QPen pen(color);
    pen.setWidthF(3);
    pen.setCapStyle(Qt::FlatCap);
    painter.setPen(pen);
    painter.setBrush(Qt::NoBrush);

    switch (state) {
    case State::Sleep: {
        auto points = arcPoints(18, 18, 18, 0.465, 4.248);
        points += arcPoints(26, 10, 18, -2.676, -5.177);
        points.append(points.first());
        painter.drawPolyline(points);
        break;
    }

    case State::Off:
    case State::Starting: {
        painter.drawPolyline(arcPoints(18, 20, 16, -pi / 3, pi * 4 / 3));
        drawLine(painter, 18, 0, 18, 19, color, 3);
        break;
    }

    case State::Rebooting: {
        painter.drawPolyline(arcPoints(18, 18, 16, -pi / 2, pi));
        painter.translate(2, 18);
        painter.rotate(-15);
        painter.drawPolyline(QPolygonF(QVector<QPointF>{{-7, 7}, {0, 0}, {7, 7}}));
        break;
    }

    case State::Overheating: {
        painter.drawPolyline(QPolygonF(QVector<QPointF>{{18, 0}, {36, 34}, {0, 34}, {18, 0}}));
        drawLine(painter, 18, 10, 18, 21, color, 3);
        drawLine(painter, 18, 26, 18, 29, color, 3);
        break;
    }

    case State::Empty: {
        painter.drawRect(QRectF(0, 1, 43, 34));
        drawLine(painter, 48, 12, 48, 24, color, 3);
        break;
    }
    }

    painter.restore();
}

QString fitHabitName(const QString &name, double fontSize) {
    const QFontMetricsF metrics(createFont(fontSize));
    if (metrics.horizontalAdvance(name) <= 287) {
        return name;
    }

    const QChar ellipsis(0x2026);
    auto label = name;
    while (!label.isEmpty() && metrics.horizontalAdvance(label + ellipsis) > 287) {
        label.chop(1);
    }

    return label + ellipsis;
}

void drawHabitMarks(QPainter &painter, const Habit &habit, int lastDay, double dayWidth, double rowHeight,
                    double centerY) {
    for (int day = 1; day <= lastDay; ++day) {
        const auto outcome = habit.entries.value(day, Outcome::Unmarked);
        if (markFor(outcome, habit.polarity) != 'X') {
            continue;
        }

        const double centerX = 411 + (day - 0.5) * dayWidth;
        const double radius = std::min(10.0, rowHeight * 0.23);
        drawLine(painter, centerX - radius, centerY - radius, centerX + radius, centerY + radius, QColor("#111111"),
                 3.4);
        drawLine(painter, centerX - radius, centerY + radius, centerX + radius, centerY - radius, QColor("#111111"),
                 3.4);
    }
}

QColor badgeBackground(State state) {
    if (state == State::Off) {
        return QColor("#111111");
    }

    if (state == State::Empty || state == State::Overheating) {
        return QColor("#dddddd");
    }

    return QColor(Qt::white);
}

void drawGrid(QPainter &painter, const Snapshot &snapshot) {
    const int days = snapshot.date.daysInMonth();
    const double dayWidth = 1365.0 / days;
    const double rowHeight = 560.0 / std::max(5, int(snapshot.habits.size()));
    const double bottom = 455 + rowHeight * snapshot.habits.size();
    const double currentX = 411 + (snapshot.date.day() - 1) * dayWidth;

    painter.fillRect(QRectF(currentX, 412, dayWidth, std::max(43.0, bottom - 412)), QColor("#eeeeee"));
    painter.fillRect(QRectF(currentX + 2, 377, dayWidth - 4, 47), QColor("#111111"));

    for (int day = 1; day <= days; ++day) {
        const double center = 411 + (day - 0.5) * dayWidth;
        drawText(painter, QString::number(day), center, 402, 29, "sans-serif", Qt::AlignHCenter,
                 day == snapshot.date.day() ? Qt::white : QColor("#111111"));
        if (day % 5 == 0 && day != days) {
            drawLine(painter, center + dayWidth / 2, 455, center + dayWidth / 2, bottom, QColor("#aaaaaa"), 1.4);
        }
    }

    drawLine(painter, 96, 455, 1776, 455, QColor("#111111"), 2);
    for (int index = 0; index < snapshot.habits.size(); ++index) {
        const auto &habit = snapshot.habits[index];
        const double centerY = 455 + (index + 0.5) * rowHeight;
        const double fontSize = std::min(33.0, rowHeight * 0.6);
        const auto label = fitHabitName(habit.name, fontSize);
        drawText(painter, label, 96, centerY, fontSize);

        drawHabitMarks(painter, habit, snapshot.date.day(), dayWidth, rowHeight, centerY);
        drawLine(painter, 96, 455 + (index + 1) * rowHeight, 1776, 455 + (index + 1) * rowHeight);
    }

    if (snapshot.habits.isEmpty()) {
        drawText(painter, "No public habits", 96, 560, 33);
    }
}
} // namespace

QImage renderBase(const Snapshot &snapshot) {
    QImage image(portraitWidth, portraitHeight, QImage::Format_RGB32);
    if (image.isNull()) {
        throw Error("Could not allocate image");
    }

    image.fill(Qt::white);
    QPainter painter(&image);
    configureLandscapePainter(painter);

    const auto month = QLocale().monthName(snapshot.date.month(), QLocale::LongFormat);
    drawText(painter, "HABIT TRACKER", 96, 100, 23);
    drawText(painter, month, 90, 200, 112, "serif");
    drawText(painter, QString::number(snapshot.date.year()), 1776, 206, 57, "serif", Qt::AlignRight);
    drawText(painter, QString::number(snapshot.date.daysInMonth()) + " days", 96, 286, 28);
    drawText(painter, QString::number(snapshot.date.day()) + " · Snapshot day", 1776, 286, 28, "sans-serif",
             Qt::AlignRight);

    drawGrid(painter, snapshot);

    drawLine(painter, 96, 1085, 1776, 1085, QColor("#111111"), 2);
    drawText(painter, QString("Snapshot · %1 %2 %3").arg(snapshot.date.day()).arg(month).arg(snapshot.date.year()), 96,
             1270, 25);
    drawText(painter, "Habit tracker", 1776, 1270, 25, "sans-serif", Qt::AlignRight);

    return image;
}

QImage renderState(const QImage &base, State state) {
    const QVector<QString> labels{
        "Sleeping", "Powered off", "Battery empty", "Starting up", "Restarting", "Overheating",
    };
    const QVector<QString> instructions{
        "Press power to wake",
        "Hold power to turn on",
        "Connect to power",
        "Please wait while reMarkable loads",
        "Please wait while reMarkable restarts",
        "Let your reMarkable cool down before use",
    };

    QImage image = base;
    QPainter painter(&image);
    configureLandscapePainter(painter);
    painter.fillRect(QRectF(0, 1100, 1872, 140), Qt::white);

    const auto label = labels.at(static_cast<int>(state));
    const auto background = badgeBackground(state);
    const QColor foreground = state == State::Off ? QColor(Qt::white) : QColor("#111111");
    const double iconWidth = state == State::Empty ? 50 : 38;
    const double width = 52 + iconWidth + 14 + QFontMetricsF(createFont(42)).horizontalAdvance(label);

    QPainterPath badge;
    const double left = 96;
    const double top = 1118;
    const double height = 100;
    const double radius = 14;

    badge.moveTo(left + radius, top);
    badge.lineTo(left + width - radius, top);
    badge.quadTo(left + width, top, left + width, top + radius);
    badge.lineTo(left + width, top + height - radius);
    badge.quadTo(left + width, top + height, left + width - radius, top + height);
    badge.lineTo(left + radius, top + height);
    badge.quadTo(left, top + height, left, top + height - radius);
    badge.lineTo(left, top + radius);
    badge.quadTo(left, top, left + radius, top);
    badge.closeSubpath();

    painter.fillPath(badge, background);
    QPen border(QColor("#111111"));
    border.setWidthF(3);
    painter.strokePath(badge, border);

    drawStateIcon(painter, state, left + 26, 1150, foreground);
    drawText(painter, label, left + 26 + iconWidth + 14, 1168, 42, "sans-serif", Qt::AlignLeft, foreground);
    drawText(painter, instructions.at(static_cast<int>(state)), 1776, 1168, 29, "sans-serif", Qt::AlignRight);

    return image;
}

QByteArray encodePng(const QImage &image) {
    QByteArray bytes;
    QBuffer buffer(&bytes);
    if (!buffer.open(QIODevice::WriteOnly) || !image.save(&buffer, "PNG")) {
        throw Error("PNG encoding failed");
    }

    return bytes;
}

void validateBootImage(const QByteArray &bytes) {
    const auto *header = reinterpret_cast<const uchar *>(bytes.constData());
    if (bytes.size() != bootSize || bytes.left(2) != "BM" || qFromLittleEndian<quint32>(header + 2) != bootSize ||
        qFromLittleEndian<quint32>(header + 10) != bootOffset || qFromLittleEndian<quint32>(header + 14) != 40 ||
        qFromLittleEndian<quint32>(header + 18) != portraitHeight ||
        qFromLittleEndian<quint32>(header + 22) != portraitWidth || qFromLittleEndian<quint16>(header + 26) != 1 ||
        qFromLittleEndian<quint16>(header + 28) != 8 || qFromLittleEndian<quint32>(header + 30) != 0) {
        throw Error("Expected an uncompressed 1872×1404, 8-bit reMarkable 1 boot BMP");
    }
}

QByteArray encodeBootImage(const QImage &portrait) {
    if (portrait.size() != QSize(portraitWidth, portraitHeight)) {
        throw Error("Invalid boot image dimensions");
    }

    const auto landscapeImage = portrait.transformed(QTransform().rotate(90)).convertToFormat(QImage::Format_RGB32);
    QByteArray bytes(bootSize, '\0');
    auto *header = reinterpret_cast<uchar *>(bytes.data());
    bytes[0] = 'B';
    bytes[1] = 'M';
    qToLittleEndian<quint32>(bootSize, header + 2);
    qToLittleEndian<quint32>(bootOffset, header + 10);
    qToLittleEndian<quint32>(40, header + 14);
    qToLittleEndian<quint32>(portraitHeight, header + 18);
    qToLittleEndian<quint32>(portraitWidth, header + 22);
    qToLittleEndian<quint16>(1, header + 26);
    qToLittleEndian<quint16>(8, header + 28);
    qToLittleEndian<quint32>(portraitHeight * portraitWidth, header + 34);
    qToLittleEndian<quint32>(256, header + 46);

    for (int shade = 0; shade < 256; ++shade) {
        header[54 + shade * 4] = uchar(shade);
        header[55 + shade * 4] = uchar(shade);
        header[56 + shade * 4] = uchar(shade);
    }

    int destination = bootOffset;
    for (int row = landscapeImage.height() - 1; row >= 0; --row) {
        const auto *pixels = reinterpret_cast<const QRgb *>(landscapeImage.constScanLine(row));
        for (int column = 0; column < landscapeImage.width(); ++column) {
            const auto pixel = pixels[column];
            header[destination++] = uchar((qRed(pixel) * 77 + qGreen(pixel) * 150 + qBlue(pixel) * 29 + 128) >> 8);
        }
    }

    return bytes;
}

RenderedImages::RenderedImages(Snapshot snapshot) : snapshot(std::move(snapshot)) {}

const QImage &RenderedImages::baseImage() {
    if (base.isNull()) {
        base = renderBase(snapshot);
    }

    return base;
}

QByteArray RenderedImages::png(State state) {
    if (!pngs.contains(state)) {
        pngs.insert(state, encodePng(renderState(baseImage(), state)));
    }

    return pngs.value(state);
}

QByteArray RenderedImages::bootImage() {
    if (boot.isEmpty()) {
        boot = encodeBootImage(renderState(baseImage(), State::Starting));
    }

    return boot;
}

} // namespace powerimages
