// Keep the deterministic test app physically separate from an ordinary development install. The
// public mode flag selects its runtime adapter; this private flag controls native identity only.
module.exports = ({ config }) => {
    if (process.env.APP_TEST_BUILD !== "1") return config;

    return {
        ...config,
        name: "Habit Tracker Test",
        scheme: "habittracker-test",
        ios: {
            ...config.ios,
            bundleIdentifier: "no.silli.habittracker.test",
        },
        android: {
            ...config.android,
            package: "no.silli.habittracker.test",
        },
    };
};
