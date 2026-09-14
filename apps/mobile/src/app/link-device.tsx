import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { normalizePairingCode, PAIRING_CODE_LENGTH } from "@/auth/pairingCode";
import { PairingApproval } from "@/components/account/PairingApproval";
import { PairingScannerControl } from "@/components/account/PairingScannerControl";
import { AppScreen } from "@/components/ui/AppScreen";
import { Card } from "@/components/ui/Card";
import { TextInputField, TextInputLabel } from "@/components/ui/TextField";

export default function LinkDeviceScreen() {
    const router = useRouter();
    const [pairingCode, setPairingCode] = useState<string>(
        Constants.expoConfig?.extra?.testPairingCode ?? "",
    );
    const normalizedPairingCode = normalizePairingCode(pairingCode);

    return (
        <AppScreen
            eyebrow="Account"
            title="Link a device"
            subtitle="Scan the QR code or enter the 6-character code"
            onBack={() => router.back()}
        >
            <Card className="flex-col gap-3.5">
                <PairingScannerControl onCodeScanned={setPairingCode} />

                <View>
                    <TextInputLabel>Or enter the pairing code</TextInputLabel>
                    <TextInputField
                        value={pairingCode}
                        onChangeText={setPairingCode}
                        placeholder="ABCDEF"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={PAIRING_CODE_LENGTH}
                        className="text-center text-xl tracking-[4px]"
                    />
                    <Text className="ml-1 mt-2 text-xs leading-5 text-ink-2">
                        Case doesn’t matter — the server normalizes it.
                    </Text>
                </View>

                {/* A new code gets its own approval state, including in-flight callbacks. */}
                <PairingApproval
                    key={normalizedPairingCode}
                    pairingCode={normalizedPairingCode}
                />
            </Card>
        </AppScreen>
    );
}
