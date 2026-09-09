// Keep the README capture build physically separate from an ordinary development install. The
// public flag controls fixture behavior in the bundle; this non-public build flag controls only
// native identity during Expo config resolution.
module.exports = ({ config }) => {
    if (process.env.README_SCREENSHOT_BUILD !== "1") return config;

    return {
        ...config,
        name: "Habit Tracker Screenshots",
        scheme: "habittracker-readme",
        android: {
            ...config.android,
            package: "no.silli.habittracker.readme",
        },
    };
};
