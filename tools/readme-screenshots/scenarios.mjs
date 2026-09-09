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
        }),
        month: Object.freeze({
            output: "android-month.png",
        }),
        habits: Object.freeze({
            output: "android-habits.png",
        }),
        sync: Object.freeze({
            output: "android-sync.png",
        }),
        pairing: Object.freeze({
            output: "android-pairing.png",
        }),
        devices: Object.freeze({
            output: "android-devices.png",
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
