#pragma once

#include "Writer.h"

#include <QCommandLineParser>
#include <QStringList>

namespace powerimages {

    struct LaunchConfiguration {
        Environment environment;
        QString imageLockPath = "/tmp/habit-tracker-power-images.lock";

        static void addBuildOptions(QCommandLineParser &parser);
        static LaunchConfiguration forCommandLine(const QCommandLineParser &parser);
        static LaunchConfiguration forAppLoad(const QStringList &arguments);
    };

} // namespace powerimages
