const { palette } = require("./src/theme/palette");

/** @type {import('tailwindcss').Config} */
// Design tokens. Color values come from the single source in `src/theme/palette.js`;
// here they're shaped into Tailwind's nested color scale.
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                surface: { DEFAULT: palette.surface, 2: palette.surface2 },
                ink: { DEFAULT: palette.ink, 2: palette.ink2, 3: palette.ink3 },
                line: palette.line,
                accent: {
                    DEFAULT: palette.accent,
                    soft: palette.accentSoft,
                    deep: palette.accentDeep,
                    muted: palette.accentMuted,
                },
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
    plugins: [],
};
