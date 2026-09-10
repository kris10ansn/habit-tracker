import { useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useState } from "react";

import { useCameraPermissionRequest } from "@/lib/useCameraPermissionRequest";

export function usePairingScanner() {
    const isFocused = useIsFocused();
    const [scannerOpen, setScannerOpen] = useState(false);
    const [cameraPermissionMessage, setCameraPermissionMessage] = useState<
        string | null
    >(null);
    const {
        cancelPendingRequest,
        requestPermission,
        requesting: requestingCamera,
    } = useCameraPermissionRequest();

    const closeScanner = useCallback(() => {
        cancelPendingRequest();
        setScannerOpen(false);
        setCameraPermissionMessage(null);
    }, [cancelPendingRequest]);

    useFocusEffect(
        useCallback(() => {
            return closeScanner;
        }, [closeScanner]),
    );

    const openScanner = useCallback(async () => {
        if (!isFocused) {
            return;
        }

        setCameraPermissionMessage(null);

        const permissionOutcome = await requestPermission();
        if (permissionOutcome === "granted") {
            setScannerOpen(true);
            return;
        }

        if (permissionOutcome === "denied") {
            setCameraPermissionMessage(
                "Camera access wasn’t granted. Enter the code manually, or enable camera access in system settings.",
            );
            return;
        }

        if (permissionOutcome === "error") {
            setCameraPermissionMessage(
                "Camera access couldn’t be requested. Enter the code manually instead.",
            );
        }
    }, [isFocused, requestPermission]);

    return {
        cameraPermissionMessage,
        closeScanner,
        openScanner,
        requestingCamera,
        scannerOpen: scannerOpen && isFocused,
    };
}
