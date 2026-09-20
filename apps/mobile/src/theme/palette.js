// Single source of truth for the app's color values. Consumed three ways:
//   - `tailwind.config.js` shapes these into Tailwind's nested color scale
//     (so `bg-accent`, `text-ink-2`, `bg-done-soft`, … exist as classes);
//   - `colors.ts` re-exports it for the few APIs that take raw color values
//     rather than NativeWind classes (the React Navigation tab bar,
//     `placeholderTextColor`).
// Plain CommonJS so the Tailwind config (Node) and app code (TS) can both read it.
// The JSDoc `@type {const}` cast is the `.js` equivalent of `as const`: TS infers
// literal, deeply-readonly types (so `colors.accent` is `'#6551c4'`, not `string`).
const palette = /** @type {const} */ ({
    surface: "#ffffff",
    surface2: "#f7f6fa",
    ink: "#252332",
    ink2: "#656171",
    ink3: "#807b8c",
    line: "#e9e5ef",
    accent: "#6551c4",
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

module.exports = { palette };
