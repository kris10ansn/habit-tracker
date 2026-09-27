// Shared by NativeWind CSS variables and raw native color APIs.
// Keep both schemes here so every surface uses the same semantic tokens.
const light = /** @type {const} */ ({
    surface: "#ffffff",
    surface2: "#f7f6fa",
    ink: "#252332",
    ink2: "#656171",
    ink3: "#807b8c",
    line: "#e9e5ef",
    accent: "#6551c4",
    onAccent: "#ffffff",
    shadow: "#252332",
    accentSoft: "#eeeafa",
    streak: "#b84308",
    streakSoft: "#ffdb9f",
    warm: "#93652e",
    warmSoft: "#f7efdf",
    done: "#19836b",
    doneSoft: "#e8f4ee",
    slip: "#bf5264",
    slipSoft: "#f9e9ed",
});

const dark = /** @type {const} */ ({
    surface: "#211e2b",
    surface2: "#15131c",
    ink: "#f1edf7",
    ink2: "#bcb5ca",
    ink3: "#9d94ad",
    line: "#3b3449",
    accent: "#b4a1fa",
    onAccent: "#241a40",
    shadow: "#000000",
    accentSoft: "#34294e",
    streak: "#ffb875",
    streakSoft: "#49301e",
    warm: "#dfb878",
    warmSoft: "#3b3022",
    done: "#72d4b4",
    doneSoft: "#1c3a32",
    slip: "#f29bad",
    slipSoft: "#442631",
});

module.exports = { light, dark };
