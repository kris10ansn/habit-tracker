const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Drizzle ships its generated migrations as .sql files imported as strings (see babel.config.js).
config.resolver.sourceExts.push("sql");

module.exports = withNativeWind(config, { input: "./global.css" });
