// The reanimated babel plugin is auto-configured by babel-preset-expo on SDK 56,
// so it must NOT be added here (doing so duplicates it and errors).
module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        // Inline Drizzle's generated .sql migration files as strings so the expo migrator can
        // bundle them (paired with metro.config.js's `sql` sourceExt).
        plugins: [["inline-import", { extensions: [".sql"] }]],
    };
};
