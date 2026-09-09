if (process.env.EXPO_PUBLIC_APP_MODE === "test") {
    require("./src/testMode/bootstrap");
}

require("expo-router/entry");
