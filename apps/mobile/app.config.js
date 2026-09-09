// Keep the deterministic test target physically separate from an ordinary development install.
// Without this build-only flag, Expo receives the normal app configuration unchanged.
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
