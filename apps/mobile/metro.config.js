const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const { withTestTarget } = require("./src/testMode/metro");

const config = getDefaultConfig(__dirname);

// Drizzle ships its generated migrations as .sql files imported as strings (see babel.config.js).
config.resolver.sourceExts.push("sql");

withTestTarget(config, __dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
