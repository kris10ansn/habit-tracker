#include "Model.h"
#include <QCryptographicHash>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonParseError>
#include <QSet>
#include <cmath>
#include <utility>

namespace powerimages {
Error::Error(const QString &message, QString path, bool superseded)
    : std::runtime_error(message.toStdString()), path(std::move(path)), superseded(superseded) {}

QDate parseDate(const QString &text) {
    const auto date = QDate::fromString(text, Qt::ISODate);
    if (!date.isValid() || date.toString(Qt::ISODate) != text)
        throw Error("Invalid date: " + text);
    return date;
}

State parseState(const QString &text) {
    const QVector<QString> names{"sleep", "off", "empty", "starting", "rebooting", "overheating"};
    const auto index = names.indexOf(text);
    if (index < 0)
        throw Error("Unknown power state: " + text);
    return static_cast<State>(index);
}
QString stateName(State state) {
    return QVector<QString>{"sleep", "off", "empty", "starting", "rebooting", "overheating"}.at(
        static_cast<int>(state));
}
QChar markFor(Outcome outcome, Polarity polarity) {
    if (outcome == Outcome::Success)
        return 'X';
    if (outcome == Outcome::Failure)
        return 'O';
    return polarity == Polarity::Negative ? QChar('X') : QChar();
}

namespace {
QJsonObject document(const QByteArray &bytes, const QString &name) {
    QJsonParseError error;
    const auto parsed = QJsonDocument::fromJson(bytes, &error);
    if (error.error != QJsonParseError::NoError || !parsed.isObject())
        throw Error("Invalid " + name + " JSON");
    return parsed.object();
}
bool timestamp(const QJsonValue &value) {
    return value.isDouble() && std::isfinite(value.toDouble()) && value.toDouble() >= 0;
}
bool deletion(const QJsonValue &value) {
    return value.isNull() || timestamp(value);
}
bool deleted(const QJsonObject &row) {
    return row["deletedAt"].isDouble() && row["deletedAt"].toDouble() != 0;
}
void validateHabit(const QJsonObject &row) {
    if (!row["id"].isString() || row["id"].toString().isEmpty() || !row["name"].isString() ||
        row["name"].toString().isEmpty() || !row["isPrivate"].isBool() || !timestamp(row["createdAt"]) ||
        !timestamp(row["editedAt"]) || !deletion(row["deletedAt"]) ||
        (row["polarity"] != "Positive" && row["polarity"] != "Negative"))
        throw Error("Unrecognised roster habit; refusing to render");
}
} // namespace

Snapshot parseSnapshot(const QByteArray &roster, const QByteArray &month, const QDate &date) {
    if (!date.isValid())
        throw Error("Invalid snapshot date");
    Snapshot snapshot{date, {}};
    const auto rosterDocument = document(roster, "roster");
    if (!rosterDocument["habits"].isArray())
        throw Error("Roster habits must be an array");
    QSet<QString> ids;
    QMap<QString, int> visible;
    for (const auto value : rosterDocument["habits"].toArray()) {
        const auto row = value.toObject();
        validateHabit(row);
        const auto id = row["id"].toString();
        if (ids.contains(id))
            throw Error("Duplicate habit id: " + id);
        ids.insert(id);
        if (deleted(row) || row["isPrivate"].toBool())
            continue;
        visible.insert(id, snapshot.habits.size());
        snapshot.habits.append(
            {id, row["name"].toString(), row["polarity"] == "Negative" ? Polarity::Negative : Polarity::Positive, {}});
    }
    if (month.isNull())
        return snapshot;
    const auto monthDocument = document(month, "month");
    if (monthDocument["month"].toString() != date.toString("yyyy-MM") || !monthDocument["entries"].isArray())
        throw Error("Month must match the snapshot date and contain an entries array");
    for (const auto value : monthDocument["entries"].toArray()) {
        const auto row = value.toObject();
        const auto entryDate = parseDate(row["date"].toString());
        if (!row["habitId"].isString() || row["habitId"].toString().isEmpty() || !timestamp(row["editedAt"]) ||
            !deletion(row["deletedAt"]) || (row["outcome"] != "x" && row["outcome"] != "o") ||
            entryDate.year() != date.year() || entryDate.month() != date.month())
            throw Error("Unrecognised month entry; refusing to render");
        const auto found = visible.constFind(row["habitId"].toString());
        if (found == visible.cend())
            continue;
        auto outcome = row["outcome"] == "x" ? Outcome::Success : Outcome::Failure;
        if (deleted(row))
            outcome = Outcome::Unmarked;
        snapshot.habits[*found].entries[entryDate.day()] = outcome;
    }
    return snapshot;
}

QByteArray snapshotSignature(const Snapshot &snapshot) {
    QJsonArray habits;
    for (const auto &habit : snapshot.habits) {
        QString marks;
        for (int day = 1; day <= snapshot.date.day(); ++day)
            marks += markFor(habit.entries.value(day, Outcome::Unmarked), habit.polarity) == 'X' ? 'X' : ' ';
        habits.append(QJsonArray{habit.name, marks});
    }
    const QJsonObject content{
        {"layout", "native-ledger-v1"}, {"date", snapshot.date.toString(Qt::ISODate)}, {"habits", habits}};
    return QCryptographicHash::hash(QJsonDocument(content).toJson(QJsonDocument::Compact), QCryptographicHash::Sha256)
        .toHex();
}
} // namespace powerimages
