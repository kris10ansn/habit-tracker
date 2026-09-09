// Mobile's one interpretation of the short code the backend mints for device pairing.
export const PAIRING_CODE_LENGTH = 6;

export const normalizePairingCode = (code: string): string =>
    code.trim().toUpperCase();
