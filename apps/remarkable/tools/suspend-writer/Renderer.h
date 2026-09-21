#pragma once
#include <QDate>
#include <QImage>
#include <QString>

QImage renderPowerImage(const QString &rosterJson, const QString &monthJson, const QDate &today,
                        const QString &powerState, const QString &jsDir, QString *error);
bool refusesShape(const QString &rosterJson, const QString &rosterPath, const QString &monthJson,
                  const QString &monthPath);
