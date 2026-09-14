import { Text } from "react-native";

import { Button } from "@/components/ui/Button";
import { PairingScanner } from "./PairingScanner";
import { usePairingScanner } from "./usePairingScanner";

interface Props {
    onCodeScanned: (pairingCode: string) => void;
}

export function PairingScannerControl({ onCodeScanned }: Props) {
    const scanner = usePairingScanner();

    const handleCodeScanned = (pairingCode: string) => {
        onCodeScanned(pairingCode);
        scanner.closeScanner();
    };

    if (scanner.isScannerVisible) {
        return (
            <PairingScanner
                onCodeScanned={handleCodeScanned}
                onCancel={scanner.closeScanner}
            />
        );
    }

    return (
        <>
            <Button
                label={
                    scanner.isRequestingCameraPermission
                        ? "Opening camera…"
                        : "Scan QR code"
                }
                onPress={scanner.openScanner}
                disabled={scanner.isRequestingCameraPermission}
            />

            {!!scanner.cameraPermissionError && (
                <Text className="text-sm text-slip">
                    {scanner.cameraPermissionError}
                </Text>
            )}
        </>
    );
}
