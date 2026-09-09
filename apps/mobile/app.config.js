// Give the deterministic Expo Go target its own project storage scope. Without this flag, Expo
// receives the normal app configuration unchanged.
module.exports = ({ config }) => {
    if (process.env.APP_TEST_MODE !== "1") return config;

    const testExtra = Object.fromEntries(
        Object.entries(config.extra ?? {}).filter(([key]) => key !== "eas"),
    );

    return {
        ...config,
        name: "Habit Tracker Test",
        slug: "habit-tracker-test",
        userInterfaceStyle: "light",
        extra: testExtra,
    };
};
