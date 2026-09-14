import { Text, View } from "react-native";

import { Button, ButtonText } from "@/components/ui/Button";
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

    if (!scanner.isScannerVisible) {
        return <Button label="Scan QR code" onPress={scanner.openScanner} />;
    }

    return (
        <View className="gap-3.5">
            <Text className="text-center text-[13px] text-ink-2">
                Point the camera at the QR code on your reMarkable.
            </Text>

            <View className="h-72 overflow-hidden rounded-field border border-line bg-surface-2">
                <ScannerContent
                    scanner={scanner}
                    onCodeScanned={handleCodeScanned}
                />
            </View>

            <Button
                onPress={scanner.closeScanner}
                className="border border-line bg-surface-2"
            >
                <ButtonText className="text-ink">Cancel scanner</ButtonText>
            </Button>
        </View>
    );
}

function ScannerContent({
    scanner,
    onCodeScanned,
}: Props & { scanner: ReturnType<typeof usePairingScanner> }) {
    if (scanner.hasCameraPermission) {
        return <PairingScanner onCodeScanned={onCodeScanned} />;
    }

    if (scanner.isRequestingCameraPermission) {
        return (
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-center text-sm text-ink-2">
                    Waiting for camera access…
                </Text>
            </View>
        );
    }

    let permissionMessage =
        "Allow camera access to scan the QR code, or enter the code below.";
    let permissionActionLabel = "Allow camera access";
    let permissionAction = scanner.openScanner;

    if (scanner.needsCameraSettings) {
        permissionMessage =
            "Enable camera access in your phone’s settings to scan the QR code, or enter the code below.";
        permissionActionLabel = "Open settings";
        permissionAction = scanner.openCameraSettings;
    }

    return (
        <View className="flex-1 items-center justify-center gap-4 px-6">
            <Text className="text-center text-sm text-ink-2">
                {scanner.cameraPermissionError ?? permissionMessage}
            </Text>
            <Button
                label={permissionActionLabel}
                onPress={permissionAction}
                className="self-stretch px-4"
            />
        </View>
    );
}
