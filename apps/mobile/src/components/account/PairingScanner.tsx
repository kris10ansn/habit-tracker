import { CameraView, type BarcodeScanningResult } from "expo-camera";
import { cssInterop } from "nativewind";
import { useRef, useState } from "react";
import { Text, View } from "react-native";

import { pairingCodeFromQrPayload } from "@/auth/pairingCode";
import { Button, ButtonText } from "@/components/ui/Button";

cssInterop(CameraView, { className: "style" });

interface Props {
    onCodeScanned: (code: string) => void;
    onCancel: () => void;
}

export function PairingScanner({ onCodeScanned, onCancel }: Props) {
    const handledScan = useRef(false);
    const [scanError, setScanError] = useState<string | null>(null);

    const onBarcodeScanned = ({ data }: BarcodeScanningResult) => {
        if (handledScan.current) {
            return;
        }
        handledScan.current = true;

        const code = pairingCodeFromQrPayload(data);
        if (!code) {
            setScanError(
                "That QR code doesn’t contain a valid 6-character pairing code.",
            );
            return;
        }

        onCodeScanned(code);
    };

    const tryAgain = () => {
        handledScan.current = false;
        setScanError(null);
    };

    const onCameraError = () => {
        handledScan.current = true;
        setScanError(
            "The camera couldn’t start. Enter the code manually instead.",
        );
    };

    return (
        <View className="gap-3.5">
            <Text className="text-center text-[13px] text-ink-2">
                Point the camera at the QR code on your reMarkable.
            </Text>

            <View className="h-72 overflow-hidden rounded-field border border-line bg-surface-2">
                {scanError ? (
                    <View className="flex-1 items-center justify-center gap-4 px-6">
                        <Text className="text-center text-[13px] text-slip">
                            {scanError}
                        </Text>
                        <Button
                            label="Try another QR code"
                            onPress={tryAgain}
                            className="self-stretch px-4"
                        />
                    </View>
                ) : (
                    <CameraView
                        className="flex-1"
                        facing="back"
                        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                        onBarcodeScanned={onBarcodeScanned}
                        onMountError={onCameraError}
                    >
                        <View
                            pointerEvents="none"
                            className="flex-1 items-center justify-center"
                        >
                            <View className="h-48 w-48 rounded-2xl border-2 border-surface" />
                        </View>
                    </CameraView>
                )}
            </View>

            <Button
                onPress={onCancel}
                className="border border-line bg-surface-2"
            >
                <ButtonText className="text-ink">Cancel scanner</ButtonText>
            </Button>
        </View>
    );
}
