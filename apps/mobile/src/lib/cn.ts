// Tiny classname joiner: drops falsy parts so conditional NativeWind classes
// read cleanly (`cn('base', active && 'bg-accent')`). No precedence merging —
// order class strings so the intended utility wins.
export const cn = (...parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join(' ');
