// Raw palette for the few APIs that take color values instead of NativeWind
// classes — chiefly the React Navigation tab bar in `src/app/_layout.tsx` and
// `placeholderTextColor` on inputs. Everything else styles via Tailwind classes.
//
// Re-exported from the single source in `palette.js` (which `tailwind.config.js`
// also consumes), so color values are defined in exactly one place.
export { palette as colors } from "./palette";
