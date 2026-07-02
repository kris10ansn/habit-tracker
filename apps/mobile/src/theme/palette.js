// Single source of truth for the app's color values. Consumed three ways:
//   - `tailwind.config.js` shapes these into Tailwind's nested color scale
//     (so `bg-accent`, `text-ink-2`, `bg-done-soft`, … exist as classes);
//   - `colors.ts` re-exports it for the few APIs that take raw color values
//     rather than NativeWind classes (the React Navigation tab bar,
//     `placeholderTextColor`).
// Plain CommonJS so the Tailwind config (Node) and app code (TS) can both read it.
// The JSDoc `@type {const}` cast is the `.js` equivalent of `as const`: TS infers
// literal, deeply-readonly types (so `colors.accent` is `'#5b5bd6'`, not `string`).
const palette = /** @type {const} */ ({
  surface: '#ffffff',
  surface2: '#f5f5f7',
  ink: '#16161a',
  ink2: '#5b5b66',
  ink3: '#9a9aa5',
  line: '#e4e4ea',
  accent: '#5b5bd6',
  accentSoft: '#ececfb',
  done: '#12a56a',
  doneSoft: '#e3f5ec',
  slip: '#e05656',
  slipSoft: '#fbe9e9',
});

module.exports = { palette };
