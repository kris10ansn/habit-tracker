// Spike: render the suspend image from the app's own SuspendDraw.js, outside the
// QML app. A QPainter-backed Canvas2D shim is exposed to a QJSEngine so the
// *actual* src/js/SuspendDraw.js draws into a QImage we save as PNG.
//
// Host-only proof of concept: no settings/backup/signature. Reads the app's own
// roster.json + month YYYY-MM.json (same on-disk shapes the QML stores write).
// Run: ./build.sh
//      ./suspend-writer --roster <roster.json> [--month <YYYY-MM.json>]
//                       [--today YYYY-MM-DD] [--out suspended.png]

#include <QGuiApplication>
#include <QImage>
#include <QPainter>
#include <QFont>
#include <QFontMetricsF>
#include <QColor>
#include <QDate>
#include <QJSEngine>
#include <QFile>
#include <QTextStream>
#include <QDebug>
#include <cmath>

#ifndef JS_DIR
#define JS_DIR "."
#endif

// The ~12-member subset of the Canvas 2D API that SuspendDraw.js touches,
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
        const double startX = m_textAlign == "center" ? x - width / 2.0 : x;

        const double baselineY = m_textBaseline == "top"
            ? y + fm.ascent()
            : y + (fm.ascent() - fm.descent()) / 2.0; // "middle"

        m_painter->drawText(QPointF(startX, baselineY), text);
    }

    Q_INVOKABLE void save() { m_painter->save(); }
    Q_INVOKABLE void restore() { m_painter->restore(); }
    Q_INVOKABLE void translate(double x, double y) { m_painter->translate(x, y); }
    Q_INVOKABLE void rotate(double radians) { m_painter->rotate(radians * 180.0 / M_PI); }

private:
    QPainter *m_painter;
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

static QString readFile(const QString &path) {
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        qWarning() << "cannot open" << path;
        return QString();
    }
    return QTextStream(&file).readAll();
}

int main(int argc, char *argv[]) {
    qputenv("QT_QPA_PLATFORM", "offscreen");
    QGuiApplication app(argc, argv);

    QString rosterPath, monthPath, todayArg;
    QString outPath = "suspended.png";
    const QStringList args = app.arguments();
    for (int i = 1; i < args.size(); i++) {
        const QString &arg = args[i];
        if (arg == "--roster" && i + 1 < args.size()) rosterPath = args[++i];
        else if (arg == "--month" && i + 1 < args.size()) monthPath = args[++i];
        else if (arg == "--today" && i + 1 < args.size()) todayArg = args[++i];
        else if (arg == "--out" && i + 1 < args.size()) outPath = args[++i];
        else { qWarning() << "unknown argument" << arg; return 2; }
    }

    if (rosterPath.isEmpty()) {
        qWarning() << "usage: suspend-writer --roster <roster.json> [--month <YYYY-MM.json>]"
                   << "[--today YYYY-MM-DD] [--out suspended.png]";
        return 2;
    }

    const QString rosterJson = readFile(rosterPath);
    if (rosterJson.isEmpty()) return 1;
    const QString monthJson = monthPath.isEmpty() ? QStringLiteral("{}") : readFile(monthPath);

    QDate today = QDate::currentDate();
    if (!todayArg.isEmpty()) {
        const QDate parsed = QDate::fromString(todayArg, "yyyy-MM-dd");
        if (parsed.isValid()) today = parsed;
        else qWarning() << "ignoring invalid --today (want YYYY-MM-DD):" << todayArg;
    }

    QImage image(1404, 1872, QImage::Format_RGB32);
    image.fill(Qt::white);

    QPainter painter(&image);
    painter.setRenderHint(QPainter::Antialiasing, true);
    painter.setRenderHint(QPainter::TextAntialiasing, true);

    Canvas2D ctx(&painter);

    ctx.setParent(&app); // keep C++ ownership so the engine's GC won't free a stack object

    QJSEngine engine;
    engine.globalObject().setProperty("ctx", engine.newQObject(&ctx));
    engine.globalObject().setProperty("rosterJson", rosterJson);
    engine.globalObject().setProperty("monthJson", monthJson);
    engine.globalObject().setProperty("todayYear", today.year());
    engine.globalObject().setProperty("todayMonth", today.month() - 1);
    engine.globalObject().setProperty("todayDay", today.day());

    // Qt.formatDate is the only QML global DateUtils.js reaches; only the
    // "MMMM yyyy" form is used, so a minimal JS stand-in suffices for the spike.
    const QString qtShim =
        "var Qt = { formatDate: function(d) {"
        "  var months = ['January','February','March','April','May','June',"
        "    'July','August','September','October','November','December'];"
        "  return months[d.getMonth()] + ' ' + d.getFullYear(); } };";

    const QString dateUtils =
        "var DateUtils = " +
        loadModule(JS_DIR "/DateUtils.js",
                   "{ daysInMonth: daysInMonth, monthName: monthName, dateKey: dateKey, "
                   "monthKey: monthKey, ordinal: ordinal }") + ";";

    const QString suspendDraw =
        "var SuspendDraw = " +
        loadModule(JS_DIR "/SuspendDraw.js",
                   "{ draw: draw, computeSignature: computeSignature }") + ";";

    // Join roster (display order + config) with the month's entries, flattening
    // { state, updatedAt } cells to bare state strings and dropping empties —
    // mirrors HabitsModel.toArray / statesOf, the projection SuspendDraw expects.
    const QString data =
        "var today = new Date(todayYear, todayMonth, todayDay);"
        "var rosterDoc = JSON.parse(rosterJson);"
        "var roster = rosterDoc && Array.isArray(rosterDoc.habits) ? rosterDoc.habits : [];"
        "var monthDoc = JSON.parse(monthJson);"
        "var month = monthDoc && monthDoc.entries ? monthDoc.entries : {};"
        "var habits = roster.map(function(habit) {"
        "  var cells = month[habit.id] || {};"
        "  var entries = {};"
        "  Object.keys(cells).forEach(function(date) {"
        "    var state = cells[date] && cells[date].state ? cells[date].state : '';"
        "    if (state) entries[date] = state;"
        "  });"
        "  return { name: habit.name, negative: !!habit.negative,"
        "    hideFromSleep: !!habit.hideFromSleep, entries: entries };"
        "});";

    const QString cfg =
        "var cfg = { margin: 40, habitsWidth: 360, boxSize: 40, boxSpacing: 5,"
        "  rowSpacing: 24, buttonGap: 20, dayLabelHeight: 32, titleFont: 48,"
        "  subtitleFont: 24, labelFont: 28, dayLabelFont: 22, borderWidth: 2,"
        "  fg: '#000000', bg: '#ffffff' };";

    const QString script = qtShim + dateUtils + suspendDraw + data + cfg +
        "SuspendDraw.draw(ctx, 1404, 1872, habits, today, cfg);";

    const QJSValue result = engine.evaluate(script);
    if (result.isError()) {
        qWarning() << "JS error:" << result.toString();
        return 1;
    }

    painter.end();

    if (!image.save(outPath)) {
        qWarning() << "failed to save" << outPath;
        return 1;
    }

    qInfo() << "wrote" << outPath;
    return 0;
}

#include "main.moc"
