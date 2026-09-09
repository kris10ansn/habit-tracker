import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import {
    isCompletePairingCode,
    normalizePairingCode,
    PAIRING_CODE_LENGTH,
} from "@/auth/pairingCode";
import { PairingScanner } from "@/components/account/PairingScanner";
import { usePairingScanner } from "@/components/account/usePairingScanner";
import { AppScreen } from "@/components/ui/AppScreen";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { TextInputField, TextInputLabel } from "@/components/ui/TextField";
import { usePairingApprove, usePairingLookup } from "@/state/queries";

// Pushed from the linked-devices screen. Not a tab — see _layout.tsx (`href: null`). The tablet
// (or another client doing the TV-style pairing flow) displays a 6-character code; scanning its
// pairing QR or typing that code looks up who's asking (GET /api/pairing/{code}) before Approve is
// offered, so the owner never approves a device they can't identify.
export default function LinkDeviceScreen() {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [approvedDeviceName, setApprovedDeviceName] = useState<string | null>(
        null,
    );
    const {
        cameraPermissionMessage,
        closeScanner,
        openScanner,
        requestingCamera,
        scannerOpen,
    } = usePairingScanner();

    const normalized = normalizePairingCode(code);
    const ready = isCompletePairingCode(normalized);

    const lookup = usePairingLookup(code);
    const approve = usePairingApprove();

    const onChangeCode = (text: string) => {
        setCode(text);
        setApprovedDeviceName(null);
    };

    const onApprove = () => {
        const deviceName = lookup.data?.deviceName ?? "the device";
        approve.mutate(normalized, {
            onSuccess: () => setApprovedDeviceName(deviceName),
        });
    };

    const onCodeScanned = (scannedCode: string) => {
        onChangeCode(scannedCode);
        closeScanner();
    };

    return (
        <AppScreen
            eyebrow="Account"
            title="Link a device"
            subtitle="Scan the QR code or enter the 6-character code"
            onBack={() => router.back()}
        >
            <Card className="flex-col gap-3.5">
                {scannerOpen ? (
                    <PairingScanner
                        onCodeScanned={onCodeScanned}
                        onCancel={closeScanner}
                    />
                ) : (
                    <Button
                        label={
                            requestingCamera
                                ? "Opening camera…"
                                : "Scan QR code"
                        }
                        onPress={openScanner}
                        disabled={requestingCamera}
                    />
                )}

                {cameraPermissionMessage ? (
                    <Text className="text-[13px] text-slip">
                        {cameraPermissionMessage}
                    </Text>
                ) : null}

                <View>
                    <TextInputLabel>Or enter the pairing code</TextInputLabel>
                    <TextInputField
                        value={code}
                        onChangeText={onChangeCode}
                        placeholder="ABCDEF"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={PAIRING_CODE_LENGTH}
                        className="text-center text-[20px] tracking-[4px]"
                    />
                    <Text className="ml-1 mt-2 text-xs leading-5 text-ink-2">
                        Case doesn’t matter — the server normalizes it.
                    </Text>
                </View>

                {ready && lookup.isPending ? <Loading /> : null}

                {ready && lookup.isError ? (
                    <Text className="text-[13px] text-slip">
                        {lookup.error.message}
                    </Text>
                ) : null}

                {ready && lookup.data ? (
                    approvedDeviceName ? (
                        <Text className="text-[13px] font-semibold text-done">
                            Approved “{approvedDeviceName}”. It can finish
                            connecting now.
                        </Text>
                    ) : (
                        <>
                            <Text className="text-[15px] text-ink">
                                Requesting device:{" "}
                                <Text className="font-semibold">
                                    {lookup.data.deviceName}
                                </Text>
                            </Text>

                            {approve.isError ? (
                                <Text className="text-[13px] text-slip">
                                    {approve.error.message}
                                </Text>
                            ) : null}

                            <Button
                                label={
                                    approve.isPending ? "Approving…" : "Approve"
                                }
                                onPress={onApprove}
                                disabled={approve.isPending}
                            />
                        </>
                    )
                ) : null}
            </Card>
        </AppScreen>
    );
}
