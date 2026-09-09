export const EXPO_GO_APP_ID = "host.exp.exponent";

export function metroEnvironment(baseEnvironment) {
    // Expo's localhost server binds Node's first DNS result, while adb reverse and the Expo Go URL
    // use 127.0.0.1. Linux commonly resolves ::1 first, which makes the IPv4 route unreachable.
    const ipv4First = "--dns-result-order=ipv4first";
    const existingNodeOptions = baseEnvironment.NODE_OPTIONS?.trim();

    return {
        ...baseEnvironment,
        CI: "1",
        NODE_OPTIONS: existingNodeOptions
            ? `${existingNodeOptions} ${ipv4First}`
            : ipv4First,
    };
}

export function expoGoRouteUrl(projectUrl, route) {
    const url = new URL(projectUrl);
    if (url.protocol !== "exp:" && url.protocol !== "exps:") {
        throw new Error(`Expected an Expo Go URL, received ${projectUrl}`);
    }

    const normalizedRoute = route.replace(/^\/+|\/+$/g, "");
    const projectPath = url.pathname.replace(/\/+$/g, "");
    url.pathname = normalizedRoute
        ? `${projectPath}/--/${normalizedRoute}`
        : projectPath;
    return url.toString();
}

export async function discoverExpoGoUrl(metroOrigin, fetchImplementation) {
    const endpoint = new URL("/_expo/open", metroOrigin);
    endpoint.searchParams.set("platform", "android");
    endpoint.searchParams.set("runtime", "expo");

    const response = await fetchImplementation(endpoint);
    if (!response.ok) {
        throw new Error(
            `Expo development server returned HTTP ${response.status}`,
        );
    }

    const result = await response.json();
    if (result.runtime !== "expo" || typeof result.url !== "string") {
        throw new Error(
            "Expo development server did not return an Expo Go URL",
        );
    }

    expoGoRouteUrl(result.url, "");
    return result.url;
}

export function chooseAvd(avds, requestedAvd) {
    if (requestedAvd) {
        if (!avds.includes(requestedAvd)) {
            throw new Error(
                `Unknown AVD ${requestedAvd}; available AVDs: ${avds.join(", ") || "none"}`,
            );
        }
        return requestedAvd;
    }
    if (avds.length === 1) return avds[0];
    if (avds.length === 0) {
        throw new Error("No Android AVDs are configured");
    }
    throw new Error(
        `More than one AVD is configured; choose one with --avd: ${avds.join(", ")}`,
    );
}

export function chooseEmulatorPort(devices) {
    const occupied = new Set(
        devices
            .map(({ serial }) => /^emulator-(\d+)$/.exec(serial)?.[1])
            .filter(Boolean)
            .map(Number),
    );
    for (let port = 5554; port <= 5682; port += 2) {
        if (!occupied.has(port)) return port;
    }
    throw new Error("No Android emulator console port is available");
}

export function pngDimensions(bytes) {
    if (
        bytes.length < 24 ||
        bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    ) {
        throw new Error("Maestro output is not a PNG");
    }

    return {
        width: bytes.readUInt32BE(16),
        height: bytes.readUInt32BE(20),
    };
}
