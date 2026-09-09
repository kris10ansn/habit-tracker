// The persisted Server URL's canonical form. Keeping this at the settings seam means standalone
// detection, account availability, and network calls all interpret the same saved value.
export const normalizeServerUrl = (value: string): string => value.trim();
