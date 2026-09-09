export function parseAdbDevices(output) {
    return output
        .split(/\r?\n/)
        .slice(1)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [serial, state] = line.split(/\s+/, 2);
            return { serial, state };
        });
}

export function validateEmulatorTarget(serial, state, qemuProperty) {
    if (!serial.startsWith("emulator-")) {
        throw new Error(`${serial} is not a local emulator serial`);
    }
    if (state !== "device") {
        throw new Error(`${serial} is not ready (state: ${state})`);
    }
    if (qemuProperty.trim() !== "1") {
        throw new Error(`${serial} does not report QEMU hardware`);
    }
}
