import { useCameraPermissions } from "expo-camera";
import { useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useRef, useState } from "react";

export function usePairingScanner() {
    const isFocused = useIsFocused();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [cameraPermissionError, setCameraPermissionError] = useState<
        string | null
    >(null);
    const [isRequestingCameraPermission, setIsRequestingCameraPermission] =
        useState(false);
    // Permission prompts can resolve after navigation. Advancing this token makes those late
    // results no-ops instead of reopening the camera when the route is visited again.
    const latestPermissionRequestId = useRef(0);

    const closeScanner = useCallback(() => {
        latestPermissionRequestId.current += 1;
        setIsScannerOpen(false);
        setIsRequestingCameraPermission(false);
        setCameraPermissionError(null);
    }, []);

    useFocusEffect(
        useCallback(() => {
            return closeScanner;
        }, [closeScanner]),
    );

    const openScanner = useCallback(async () => {
        if (!isFocused) {
            return;
        }

        const requestId = latestPermissionRequestId.current + 1;
        latestPermissionRequestId.current = requestId;
        setCameraPermissionError(null);

        if (cameraPermission?.granted) {
            setIsScannerOpen(true);
            return;
        }

        setIsRequestingCameraPermission(true);
        try {
            const permission = await requestCameraPermission();
            if (requestId !== latestPermissionRequestId.current) {
                return;
            }

            if (permission.granted) {
                setIsScannerOpen(true);
                return;
            }

            setCameraPermissionError(
                "Camera access wasn’t granted. Enter the code manually, or enable camera access in system settings.",
            );
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
    }, [cameraPermission?.granted, isFocused, requestCameraPermission]);

    return {
        cameraPermissionError,
        closeScanner,
        openScanner,
        isRequestingCameraPermission,
        isScannerVisible: isScannerOpen && isFocused,
    };
}
