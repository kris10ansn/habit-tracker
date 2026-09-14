export const PAIRING_CODE_LENGTH = 6;

export function normalizePairingCode(code: string): string {
    return code.trim().toUpperCase();
}

export function isCompletePairingCode(code: string): boolean {
    return normalizePairingCode(code).length === PAIRING_CODE_LENGTH;
}

// The QR carries the backend-issued code unchanged, so scanning and manual entry share one path.
export function pairingCodeFromQrPayload(payload: string): string | null {
    const code = normalizePairingCode(payload);
    return isCompletePairingCode(code) ? code : null;
}
