/** @type {import('tailwindcss').Config} */
// Design tokens. Keep the color values in sync with `src/theme/colors.ts`, which
// re-declares the palette for the few React Navigation APIs that take raw colors
// (the tab bar) rather than Tailwind classes.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#ffffff', 2: '#f5f5f7' },
        ink: { DEFAULT: '#16161a', 2: '#5b5b66', 3: '#9a9aa5' },
        line: '#e4e4ea',
        accent: { DEFAULT: '#5b5bd6', soft: '#ececfb' },
        done: { DEFAULT: '#12a56a', soft: '#e3f5ec' },
        slip: { DEFAULT: '#e05656', soft: '#fbe9e9' },
      },
      borderRadius: {
        card: '18px',
        field: '12px',
      },
    },
  },
  plugins: [],
};
