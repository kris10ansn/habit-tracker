export const scenarios = Object.freeze({
    remarkable: Object.freeze({
        grid: Object.freeze({
            output: "remarkable-grid.png",
            view: "grid",
            editing: false,
        }),
        edit: Object.freeze({
            output: "remarkable-edit.png",
            view: "grid",
            editing: true,
        }),
        settings: Object.freeze({
            output: "remarkable-settings.png",
            view: "settings",
            pairing: "connected",
        }),
        pairing: Object.freeze({
            output: "remarkable-pairing.png",
            view: "settings",
            pairing: "waiting",
        }),
        suspend: Object.freeze({
            output: "remarkable-suspend.png",
            renderer: "suspend",
        }),
    }),
    android: Object.freeze({
        today: Object.freeze({
            output: "android-today.png",
            route: "",
            readyText: Object.freeze(["September 9", "Read 20 min"]),
        }),
        month: Object.freeze({
            output: "android-month.png",
            route: "month",
            readyText: Object.freeze(["Month", "September 2026"]),
        }),
        habits: Object.freeze({
            output: "android-habits.png",
            route: "habits",
            readyText: Object.freeze(["Habits", "Read 20 min"]),
        }),
        sync: Object.freeze({
            output: "android-sync.png",
            route: "sync",
            readyText: Object.freeze(["Sync", "alex@example.com"]),
        }),
        devices: Object.freeze({
            output: "android-devices.png",
            route: "devices",
            readyText: Object.freeze([
                "Linked devices",
                "Pixel 9a",
                "reMarkable 1",
            ]),
        }),
        pairing: Object.freeze({
            output: "android-pairing.png",
            route: "link-device",
            readyText: Object.freeze(["Link a device", "PAIRING CODE"]),
        }),
    }),
});

export function selectScenarios(client, scenario) {
    const clientScenarios = scenarios[client];
    if (!clientScenarios)
        throw new Error(`Unknown screenshot client: ${client}`);
    if (!scenario) return Object.entries(clientScenarios);
    if (!clientScenarios[scenario])
        throw new Error(`Unknown ${client} scenario: ${scenario}`);
    return [[scenario, clientScenarios[scenario]]];
}
