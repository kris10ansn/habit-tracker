#pragma once

#include <QByteArray>
#include <QDate>
#include <QMap>
#include <QString>
#include <QVector>
#include <stdexcept>

namespace powerimages {

class Error : public std::runtime_error {
  public:
    explicit Error(const QString &message, QString path = {}, bool superseded = false);
    QString path;
    bool superseded;
};

enum class Polarity { Positive, Negative };
enum class Outcome { Unmarked, Success, Failure };
enum class State { Sleep, Off, Empty, Starting, Rebooting, Overheating };

struct Habit {
    QString id;
    QString name;
    Polarity polarity;
    QMap<int, Outcome> entries;
};

struct Snapshot {
    QDate date;
    QVector<Habit> habits;
};

QDate parseDate(const QString &text);
State parseState(const QString &text);
QString stateName(State state);
QChar markFor(Outcome outcome, Polarity polarity);
Snapshot parseSnapshot(const QByteArray &roster, const QByteArray &month, const QDate &date);
QByteArray snapshotSignature(const Snapshot &snapshot);

} // namespace powerimages
