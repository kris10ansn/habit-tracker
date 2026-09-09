const path = require("node:path");

const APP_PROVIDERS_IMPORT = "@/components/AppProviders";

// Replace only the root layout's provider import in the isolated test target. Relative imports,
// including the adapter's import of the production provider, keep Metro's ordinary resolution.
function withTestTarget(config, projectRoot) {
    if (process.env.APP_TEST_BUILD !== "1") return config;

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

        return defaultResolveRequest
            ? defaultResolveRequest(context, moduleName, platform)
            : context.resolveRequest(context, moduleName, platform);
    };

    return config;
}

module.exports = { APP_PROVIDERS_IMPORT, withTestTarget };
