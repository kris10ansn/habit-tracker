// Recover only driver/transport failures. Assertion failures and arbitrary app errors must fail.
export function isMaestroConnectionFailure(diagnostic) {
    return /DeviceServerDiedException|device offline|Android driver unreachable|at maestro\.drivers\.AndroidDriver\.installMaestroServerApp/.test(
        diagnostic,
    );
}
