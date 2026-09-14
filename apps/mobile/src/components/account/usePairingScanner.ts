import { useCameraPermissions } from "expo-camera";
import { useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { AppState, Linking } from "react-native";

export function usePairingScanner() {
    const isFocused = useIsFocused();
    const [cameraPermission, requestCameraPermission, getCameraPermission] =
        useCameraPermissions({ get: false });
    const [isScannerOpen, setIsScannerOpen] = useState(true);
    const [cameraPermissionError, setCameraPermissionError] = useState<
        string | null
    >(null);
    const [isRequestingCameraPermission, setIsRequestingCameraPermission] =
        useState(true);
    // Permission prompts can resolve after navigation. Advancing this token makes those late
    // results no-ops instead of reopening the camera when the route is visited again.
    const latestPermissionRequestId = useRef(0);

    const closeScanner = useCallback(() => {
        latestPermissionRequestId.current += 1;
        setIsScannerOpen(false);
        setIsRequestingCameraPermission(false);
        setCameraPermissionError(null);
    }, []);

    const openScanner = useCallback(async () => {
        const requestId = latestPermissionRequestId.current + 1;
        latestPermissionRequestId.current = requestId;
        setIsScannerOpen(true);
        setCameraPermissionError(null);
        setIsRequestingCameraPermission(true);
        try {
            const permission = await getCameraPermission();
            if (requestId !== latestPermissionRequestId.current) {
                return;
            }

            if (!permission.granted && permission.canAskAgain) {
                await requestCameraPermission();
            }
        } catch {
            if (requestId === latestPermissionRequestId.current) {
                setCameraPermissionError(
                    "Camera access couldn’t be requested. Enter the code manually instead.",
                );
            }
        } finally {
            if (requestId === latestPermissionRequestId.current) {
                setIsRequestingCameraPermission(false);
            }
        }
    }, [getCameraPermission, requestCameraPermission]);

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
                    void getCameraPermission().catch(() => {
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
        }, [getCameraPermission, isRequestingCameraPermission, isScannerOpen]),
    );

    const openCameraSettings = async () => {
        const requestId = latestPermissionRequestId.current;
        setCameraPermissionError(null);
        try {
            await Linking.openSettings();
        } catch {
            if (requestId === latestPermissionRequestId.current) {
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
        hasCameraPermission: cameraPermission?.granted === true,
        needsCameraSettings: cameraPermission?.canAskAgain === false,
        isRequestingCameraPermission,
        isScannerVisible: isScannerOpen && isFocused,
    };
}
