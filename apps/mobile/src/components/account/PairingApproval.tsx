import { useState } from "react";
import { Text } from "react-native";

import { isCompletePairingCode } from "@/auth/pairingCode";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { usePairingApprove, usePairingLookup } from "@/state/queries";

interface Props {
    pairingCode: string;
}

export function PairingApproval({ pairingCode }: Props) {
    const pairingLookup = usePairingLookup(pairingCode);
    const pairingApproval = usePairingApprove();
    const [approvedDeviceName, setApprovedDeviceName] = useState<string | null>(
        null,
    );
    const isCodeReady = isCompletePairingCode(pairingCode);

    if (!isCodeReady) {
        return null;
    }

    if (approvedDeviceName) {
        return (
            <Text className="text-sm font-semibold text-done">
                Approved “{approvedDeviceName}”. It can finish connecting now.
            </Text>
        );
    }

    if (pairingLookup.isPending) {
        return <Loading />;
    }

    if (pairingLookup.isError) {
        return (
            <Text className="text-sm text-slip">
                {pairingLookup.error.message}
            </Text>
        );
    }

    const requestingDevice = pairingLookup.data;

    const approveDevice = () => {
        pairingApproval.mutate(pairingCode, {
            onSuccess: () => setApprovedDeviceName(requestingDevice.deviceName),
        });
    };

    return (
        <>
            <Text className="text-sm text-ink">
                Requesting device:{" "}
                <Text className="font-semibold">
                    {requestingDevice.deviceName}
                </Text>
            </Text>

            {pairingApproval.isError && (
                <Text className="text-sm text-slip">
                    {pairingApproval.error.message}
                </Text>
            )}

            <Button
                label={pairingApproval.isPending ? "Approving…" : "Approve"}
                onPress={approveDevice}
                disabled={pairingApproval.isPending}
            />
        </>
    );
}
