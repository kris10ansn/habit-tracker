#include "Renderer.h"
#include <QColor>
#include <QDate>
#include <QDebug>
#include <QFile>
#include <QFont>
#include <QFontMetricsF>
#include <QGuiApplication>
#include <QImage>
#include <QJSEngine>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QPainter>
#include <QPainterPath>
#include <QTextStream>
#include <QVariantMap>
#include <cmath>

// Default location of the app's JS modules; overridable at runtime with --js-dir
// (on the device the loose .js files live wherever they're deployed, not here).
#ifndef JS_DIR
#define JS_DIR "."
#endif

// The subset of the Canvas 2D API that SuspendDraw.js touches,
// backed by a QPainter. save/restore/translate/rotate map 1:1 onto QPainter;
// textAlign/textBaseline are honoured via QFontMetricsF.
class Canvas2D : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString fillStyle MEMBER m_fillStyle)
    Q_PROPERTY(QString strokeStyle MEMBER m_strokeStyle)
    Q_PROPERTY(QString font READ font WRITE setFont)
    Q_PROPERTY(double lineWidth MEMBER m_lineWidth)
    Q_PROPERTY(QString textAlign MEMBER m_textAlign)
    Q_PROPERTY(QString textBaseline MEMBER m_textBaseline)

  public:
    explicit Canvas2D(QPainter *painter) : m_painter(painter) {}

    QString font() const { return m_fontSpec; }

    // Parse a CSS-ish "[bold ]<px>px <family>" spec into a QFont.
    void setFont(const QString &spec) {
        m_fontSpec = spec;
        const bool bold = spec.contains("bold");

        const int pxIndex = spec.indexOf("px");
        int start = pxIndex - 1;
        while (start >= 0 && (spec[start].isDigit() || spec[start] == '.'))
            start--;
        const double pixelSize = spec.mid(start + 1, pxIndex - start - 1).toDouble();

        QString family = spec.mid(pxIndex + 2).trimmed();

        m_font = QFont(family);
        m_font.setPixelSize(static_cast<int>(pixelSize));
        m_font.setBold(bold);
    }

    Q_INVOKABLE void fillRect(double x, double y, double w, double h) {
        m_painter->fillRect(QRectF(x, y, w, h), QColor(m_fillStyle));
    }

    Q_INVOKABLE void strokeRect(double x, double y, double w, double h) {
        QPen pen{QColor(m_strokeStyle)};
        pen.setWidthF(m_lineWidth);
        m_painter->setPen(pen);
        m_painter->setBrush(Qt::NoBrush);
        m_painter->drawRect(QRectF(x, y, w, h));
    }

    Q_INVOKABLE void fillText(const QString &text, double x, double y) {
        m_painter->setFont(m_font);
        m_painter->setPen(QColor(m_fillStyle));

        const QFontMetricsF fm(m_font);
        const double width = fm.horizontalAdvance(text);
        double startX = x;
        if (m_textAlign == "center")
            startX -= width / 2.0;
        else if (m_textAlign == "right")
            startX -= width;

        const double baselineY =
            m_textBaseline == "top" ? y + fm.ascent() : y + (fm.ascent() - fm.descent()) / 2.0; // "middle"

        m_painter->drawText(QPointF(startX, baselineY), text);
    }

    Q_INVOKABLE QVariantMap measureText(const QString &text) {
        return {{"width", QFontMetricsF(m_font).horizontalAdvance(text)}};
    }
    Q_INVOKABLE void scale(double x, double y) { m_painter->scale(x, y); }
    Q_INVOKABLE void beginPath() { m_path = QPainterPath(); }
    Q_INVOKABLE void moveTo(double x, double y) { m_path.moveTo(x, y); }
    Q_INVOKABLE void lineTo(double x, double y) { m_path.lineTo(x, y); }
    Q_INVOKABLE void quadraticCurveTo(double controlX, double controlY, double x, double y) {
        m_path.quadTo(controlX, controlY, x, y);
    }
    Q_INVOKABLE void closePath() { m_path.closeSubpath(); }
    Q_INVOKABLE void fill() { m_painter->fillPath(m_path, QColor(m_fillStyle)); }
    Q_INVOKABLE void stroke() {
        QPen pen{QColor(m_strokeStyle)};
        pen.setWidthF(m_lineWidth);
        m_painter->setPen(pen);
        m_painter->setBrush(Qt::NoBrush);
        m_painter->drawPath(m_path);
    }

    Q_INVOKABLE void save() { m_painter->save(); }
    Q_INVOKABLE void restore() { m_painter->restore(); }
    Q_INVOKABLE void translate(double x, double y) { m_painter->translate(x, y); }
    Q_INVOKABLE void rotate(double radians) { m_painter->rotate(radians * 180.0 / M_PI); }

  private:
    QPainter *m_painter;
    QPainterPath m_path;
    QString m_fillStyle = "#000000";
    QString m_strokeStyle = "#000000";
    QString m_fontSpec;
    QFont m_font;
    double m_lineWidth = 1.0;
    QString m_textAlign = "left";
    QString m_textBaseline = "top";
};

// Strip QML's JS extensions (.import / .pragma) that a bare QJSEngine rejects,
// then wrap the file in an IIFE that returns the named exports as a namespace
// object — mirroring how QML resolves `import "X.js" as X`.
static QString loadModule(const QString &path, const QString &exports) {
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        qWarning() << "cannot open" << path;
        return QString();
    }
    QString body = QTextStream(&file).readAll();

    QStringList kept;
    for (const QString &line : body.split('\n')) {
        const QString trimmed = line.trimmed();
        if (trimmed.startsWith(".import") || trimmed.startsWith(".pragma"))
            continue;
        kept << line;
    }

    return "(function(){\n" + kept.join('\n') + "\nreturn " + exports + ";\n})()";
}

static bool refuse(const QString &path, const QString &why,
                   const QString &script = "scripts/migrate-edited-at.mjs") {
    qWarning().noquote() << path << "is in an older storage shape (" + why + ")." << "Run" << script
                         << "against a copy first"
                         << "— see docs/adr/0006-external-one-shot-migrations.md.";
    return true;
}

// The app refuses a file it cannot read rather than folding it in as empty (ADR 0006). The tool
// does the same: rendering a pre-migration file would silently produce a blank or wrong grid,
// which reads as "no marks yet" rather than "wrong format".
bool refusesShape(const QString &rosterJson, const QString &rosterPath, const QString &monthJson,
                  const QString &monthPath) {
    const QJsonArray habits = QJsonDocument::fromJson(rosterJson.toUtf8()).object().value("habits").toArray();

    for (const QJsonValue &habit : habits) {
        if (!habit.toObject().contains("polarity"))
            return refuse(rosterPath, "a habit has no `polarity`");
        if (!habit.toObject().contains("editedAt"))
            return refuse(rosterPath, "a habit still spells its edit-time `updatedAt`");
        // A habit without `isPrivate` still spells the old device-local `hideFromSleep` (or
        // predates it entirely). Rendering it as `isPrivate: false` would put a private habit on
        // the lock screen, so refuse rather than guess.
        if (!habit.toObject().contains("isPrivate"))
            return refuse(rosterPath, "a habit still spells its private flag `hideFromSleep`",
                          "scripts/migrate-is-private.mjs");
    }

    const QJsonValue entries = QJsonDocument::fromJson(monthJson.toUtf8()).object().value("entries");

    if (!entries.isUndefined() && !entries.isArray())
        return refuse(monthPath, "`entries` is not an array of rows");

    for (const QJsonValue &row : entries.toArray()) {
        if (!row.toObject().contains("editedAt"))
            return refuse(monthPath, "a row still spells its edit-time `updatedAt`");
    }

    return false;
}

QImage renderPowerImage(const QString &rosterJson, const QString &monthJson, const QDate &today,
                        const QString &powerState, const QString &jsDir, QString *error) {
    QImage image(1404, 1872, QImage::Format_RGB32);
    image.fill(Qt::white);

    QPainter painter(&image);
    painter.setRenderHint(QPainter::Antialiasing, true);
    painter.setRenderHint(QPainter::TextAntialiasing, true);

    QObject owner;
    Canvas2D ctx(&painter);
    ctx.setParent(&owner);

    QJSEngine engine;
    engine.globalObject().setProperty("ctx", engine.newQObject(&ctx));
    engine.globalObject().setProperty("powerState", powerState);
    engine.globalObject().setProperty("rosterJson", rosterJson);
    engine.globalObject().setProperty("monthJson", monthJson);
    engine.globalObject().setProperty("todayYear", today.year());
    engine.globalObject().setProperty("todayMonth", today.month() - 1);
    engine.globalObject().setProperty("todayDay", today.day());

    // Qt.formatDate is the only QML global DateUtils.js reaches; only the
    // "MMMM yyyy" form is used, so a minimal JS stand-in suffices for the spike.
    const QString qtShim = "var Qt = { formatDate: function(d) {"
                           "  var months = ['January','February','March','April','May','June',"
                           "    'July','August','September','October','November','December'];"
                           "  return months[d.getMonth()] + ' ' + d.getFullYear(); } };";

    const QString dateUtils =
        "var DateUtils = " +
        loadModule(jsDir + "/DateUtils.js",
                   "{ daysInMonth: daysInMonth, monthName: monthName, dateKey: dateKey, "
                   "monthKey: monthKey, ordinal: ordinal }") +
        ";";

    const QString polarity = "var Polarity = " +
                             loadModule(jsDir + "/Polarity.js",
                                        "{ POSITIVE: POSITIVE, NEGATIVE: NEGATIVE, isNegative: isNegative, "
                                        "toggled: toggled }") +
                             ";";

    const QString entries =
        "var Entries = " +
        loadModule(jsDir + "/Entries.js", "{ markFor: markFor, outcomeOf: outcomeOf, byHabitId: byHabitId, "
                                          "outcomesByDate: outcomesByDate }") +
        ";";

    const QString habitsModel =
        "var HabitsModel = " + loadModule(jsDir + "/HabitsModel.js", "{ toSuspendHabits: toSuspendHabits }") +
        ";";

    const QString suspendDraw =
        "var SuspendDraw = " +
        loadModule(jsDir + "/SuspendDraw.js", "{ draw: draw, computeSignature: computeSignature }") + ";";

    // Join the month's entry rows onto the roster by habit id — the one step HabitsStore does that
    // has no module of its own — then hand that to the app's own projection through a stand-in for
    // the QML ListModel it reads. Which habits and marks render (tombstones, private habits, glyph
    // choice) stays in HabitsModel and Entries, so a storage change lands here or nowhere rather
    // than silently drifting in a copy.
    const QString data =
        "var today = new Date(todayYear, todayMonth, todayDay);"
        "var rosterDoc = JSON.parse(rosterJson);"
        "var roster = rosterDoc && Array.isArray(rosterDoc.habits) ? rosterDoc.habits : [];"
        "var alive = roster.filter(function(habit) { return !habit.deletedAt; });"
        "var monthDoc = JSON.parse(monthJson);"
        "var entryRows = monthDoc && Array.isArray(monthDoc.entries) ? monthDoc.entries : [];"
        "var entriesByHabitId = Entries.byHabitId(entryRows);"
        "var rosterModel = { count: alive.length, get: function(i) {"
        "  var habit = alive[i];"
        "  return { name: habit.name, polarity: habit.polarity,"
        "    isPrivate: !!habit.isPrivate,"
        "    entriesByDate: entriesByHabitId[habit.id] || {} };"
        "} };"
        "var habits = HabitsModel.toSuspendHabits(rosterModel);";

    const QString cfg = "var cfg = { margin: 40, habitsWidth: 360, boxSize: 40, boxSpacing: 5,"
                        "  rowSpacing: 24, buttonGap: 20, dayLabelHeight: 32, titleFont: 48,"
                        "  subtitleFont: 24, labelFont: 28, dayLabelFont: 22, borderWidth: 2,"
                        "  fg: '#000000', bg: '#ffffff' };";

    const QString script = qtShim + dateUtils + polarity + entries + habitsModel + suspendDraw + data + cfg +
                           "SuspendDraw.draw(ctx, 1404, 1872, habits, today, cfg, powerState);";

    const QJSValue result = engine.evaluate(script);
    if (result.isError()) {
        *error = "Renderer: " + result.toString();
        return QImage();
    }

    painter.end();
    return image;
}

#include "Renderer.moc"
