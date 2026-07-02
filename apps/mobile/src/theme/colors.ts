// Raw palette for the few APIs that take color values instead of NativeWind
// classes — chiefly the React Navigation tab bar in `src/app/_layout.tsx` and
// `placeholderTextColor` on inputs. Everything else styles via Tailwind classes.
//
// Mirror of the `colors` block in `tailwind.config.js` — keep the two in sync.
export const colors = {
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
} as const;
