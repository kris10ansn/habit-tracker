import { useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { AppState, Linking } from "react-native";

import { useCameraPermissionRequest } from "@/lib/useCameraPermissionRequest";

export function usePairingScanner() {
    const isFocused = useIsFocused();
    const {
        cancelPendingRequest,
        hasCameraPermission,
        needsCameraSettings,
        refreshPermission,
        requestPermission,
        requesting: isRequestingCameraPermission,
    } = useCameraPermissionRequest();
    const [isScannerOpen, setIsScannerOpen] = useState(true);
    const [cameraPermissionError, setCameraPermissionError] = useState<
        string | null
    >(null);
    // Ignore errors from permission and Settings requests after the scanner is closed or reopened.
    const latestScannerSessionId = useRef(0);

    const closeScanner = useCallback(() => {
        latestScannerSessionId.current += 1;
        cancelPendingRequest();
        setIsScannerOpen(false);
        setCameraPermissionError(null);
    }, [cancelPendingRequest]);

    const openScanner = useCallback(async () => {
        const scannerSessionId = latestScannerSessionId.current + 1;
        latestScannerSessionId.current = scannerSessionId;
        setIsScannerOpen(true);
        setCameraPermissionError(null);

        const permissionOutcome = await requestPermission();
        if (
            permissionOutcome === "error" &&
            scannerSessionId === latestScannerSessionId.current
        ) {
            setCameraPermissionError(
                "Camera access couldn’t be requested. Enter the code manually instead.",
            );
        }
    }, [requestPermission]);

    useFocusEffect(
        useCallback(() => {
            void openScanner();
            return closeScanner;
        }, [closeScanner, openScanner]),
    );

    useFocusEffect(
        useCallback(() => {
            if (!isScannerOpen || isRequestingCameraPermission) {
                return;
            }

            // Returning from Settings can grant or revoke access without remounting the route.
            let cancelled = false;
            const subscription = AppState.addEventListener(
                "change",
                (state) => {
                    if (state !== "active") {
                        return;
                    }
                    void refreshPermission().catch(() => {
                        if (!cancelled) {
                            setCameraPermissionError(
                                "Camera access couldn’t be checked. Try again or enter the code manually.",
                            );
                        }
                    });
                },
            );
            return () => {
                cancelled = true;
                subscription.remove();
            };
        }, [refreshPermission, isRequestingCameraPermission, isScannerOpen]),
    );

    const openCameraSettings = async () => {
        const scannerSessionId = latestScannerSessionId.current;
        setCameraPermissionError(null);
        try {
            await Linking.openSettings();
        } catch {
            if (scannerSessionId === latestScannerSessionId.current) {
                setCameraPermissionError(
                    "Settings couldn’t be opened. Enable camera access in your phone’s settings, or enter the code manually.",
                );
            }
        }
    };

    return {
        cameraPermissionError,
        closeScanner,
        openScanner,
        openCameraSettings,
        hasCameraPermission,
        needsCameraSettings,
        isRequestingCameraPermission,
        isScannerVisible: isScannerOpen && isFocused,
    };
}
