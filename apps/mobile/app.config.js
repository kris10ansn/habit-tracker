// Keep the deterministic test target separate from an ordinary development install. Expo Go uses
// the distinct slug as its project scope; standalone builds use the distinct native identifiers.
// Without this flag, Expo receives the normal app configuration unchanged.
module.exports = ({ config }) => {
    if (process.env.APP_TEST_MODE !== "1") return config;

    const testExtra = Object.fromEntries(
        Object.entries(config.extra ?? {}).filter(([key]) => key !== "eas"),
    );

    return {
        ...config,
        name: "Habit Tracker Test",
        slug: "habit-tracker-test",
        scheme: "habittracker-test",
        extra: testExtra,
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
