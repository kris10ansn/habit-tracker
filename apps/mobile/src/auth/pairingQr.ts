// The reMarkable wraps its short-lived pairing code in this versioned envelope. Accept only that
// format before looking up the embedded code.
const PAIRING_QR_PREFIX = "HABITTRACKER:1:";
const PAIRING_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export function pairingCodeFromQrPayload(payload: string): string | null {
    // Stay strict so an unrelated QR code never becomes a backend pairing lookup by accident.
    if (!payload.startsWith(PAIRING_QR_PREFIX)) {
        return null;
    }

    const code = payload.slice(PAIRING_QR_PREFIX.length);
    return PAIRING_CODE_PATTERN.test(code) ? code : null;
}
