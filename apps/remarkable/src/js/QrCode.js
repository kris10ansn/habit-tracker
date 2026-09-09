.import "vendor/qrcode-generator.js" as QrCodeGenerator

// Keep the pairing symbol at a predictable size for the e-ink layout. The vendored encoder owns
// QR construction, error correction, masking, and matrix generation; this module only validates
// the deliberately small pairing envelope and adapts its matrix API for QML.
const QR_VERSION = 2;
const ERROR_CORRECTION_LEVEL = "M";
const MODE = "Alphanumeric";
const MAXIMUM_ALPHANUMERIC_CHARACTERS = 38;
const ALPHANUMERIC_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

function encodeAlphanumeric(text) {
    _validateText(text);

    const qrCode = QrCodeGenerator.qrcode(
        QR_VERSION,
        ERROR_CORRECTION_LEVEL,
    );
    qrCode.addData(text, MODE);
    qrCode.make();

    const size = qrCode.getModuleCount();
    const modules = [];
    for (let row = 0; row < size; row += 1) {
        const moduleRow = [];
        for (let column = 0; column < size; column += 1) {
            moduleRow.push(qrCode.isDark(row, column));
        }
        modules.push(moduleRow);
    }

    return modules;
}

function _validateText(text) {
    if (typeof text !== "string" || !text.length) {
        throw new Error("QR text must not be empty");
    }
    if (text.length > MAXIMUM_ALPHANUMERIC_CHARACTERS) {
        throw new Error("QR text is too long");
    }

    const unsupportedCharacter = [...text].find(
        (character) => !ALPHANUMERIC_CHARACTERS.includes(character),
    );
    if (unsupportedCharacter) {
        throw new Error(
            `QR text contains unsupported character: ${unsupportedCharacter}`,
        );
    }
}
