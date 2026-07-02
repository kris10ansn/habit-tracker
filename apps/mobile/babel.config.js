// The reanimated babel plugin is auto-configured by babel-preset-expo on SDK 56,
// so it must NOT be added here (doing so duplicates it and errors).
module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
    };
};
