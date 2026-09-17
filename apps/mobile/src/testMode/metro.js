const path = require("node:path");

const APP_PROVIDERS_IMPORT = "@/components/AppProviders";
const CAMERA_IMPORT = "expo-camera";

// Keep test adapters and their assets out of the ordinary app's dependency graph.
function withTestTarget(config, projectRoot) {
    if (process.env.APP_TEST_MODE !== "1") return config;

    const defaultResolveRequest = config.resolver.resolveRequest;
    config.resolver.resolveRequest = (context, moduleName, platform) => {
        if (moduleName === APP_PROVIDERS_IMPORT) {
            return {
                type: "sourceFile",
                filePath: path.resolve(
                    projectRoot,
                    "src/testMode/TestAppProviders.tsx",
                ),
            };
        }

        if (moduleName === CAMERA_IMPORT) {
            return {
                type: "sourceFile",
                filePath: path.resolve(
                    projectRoot,
                    "src/testMode/TestCamera.tsx",
                ),
            };
        }

        return defaultResolveRequest
            ? defaultResolveRequest(context, moduleName, platform)
            : context.resolveRequest(context, moduleName, platform);
    };

    return config;
}

module.exports = { APP_PROVIDERS_IMPORT, CAMERA_IMPORT, withTestTarget };
