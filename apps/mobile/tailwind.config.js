const { light, dark } = require("./src/theme/palette");

// RGB channels preserve Tailwind opacity modifiers such as bg-ink-3/10.
const variables = (palette) =>
    Object.fromEntries(
        Object.entries(palette).map(([name, hex]) => [
            `--color-${name}`,
            hex
                .slice(1)
                .match(/.{2}/g)
                .map((channel) => parseInt(channel, 16))
                .join(" "),
        ]),
    );
const palette = Object.fromEntries(
    Object.keys(light).map((name) => [
        name,
        `rgb(var(--color-${name}) / <alpha-value>)`,
    ]),
);

/** @type {import('tailwindcss').Config} */
// Design tokens. Color values come from the single source in `src/theme/palette.js`;
// here they're shaped into Tailwind's nested color scale.
module.exports = {
    darkMode: "media",
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                surface: { DEFAULT: palette.surface, 2: palette.surface2 },
                ink: { DEFAULT: palette.ink, 2: palette.ink2, 3: palette.ink3 },
                line: palette.line,
                "on-accent": palette.onAccent,
                accent: {
                    DEFAULT: palette.accent,
                    soft: palette.accentSoft,
                },
                streak: { DEFAULT: palette.streak, soft: palette.streakSoft },
                warm: { DEFAULT: palette.warm, soft: palette.warmSoft },
                done: { DEFAULT: palette.done, soft: palette.doneSoft },
                slip: { DEFAULT: palette.slip, soft: palette.slipSoft },
            },
            borderRadius: {
                card: "24px",
                field: "16px",
            },
        },
    },
    plugins: [
        ({ addBase }) =>
            addBase({
                ":root": variables(light),
                "@media (prefers-color-scheme: dark)": {
                    ":root": variables(dark),
                },
            }),
    ],
};
