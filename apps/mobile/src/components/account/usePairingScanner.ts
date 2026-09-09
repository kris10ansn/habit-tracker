import { useCameraPermissions } from "expo-camera";
import { useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useRef, useState } from "react";

export function usePairingScanner() {
    const isFocused = useIsFocused();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [scannerOpen, setScannerOpen] = useState(false);
    const [cameraPermissionMessage, setCameraPermissionMessage] = useState<
        string | null
    >(null);
    const [requestingCamera, setRequestingCamera] = useState(false);
    // Permission prompts can resolve after navigation. Advancing this token makes those late
    // results no-ops instead of reopening the camera when the route is visited again.
    const permissionRequestGeneration = useRef(0);

    const closeScanner = useCallback(() => {
        permissionRequestGeneration.current += 1;
        setScannerOpen(false);
        setRequestingCamera(false);
        setCameraPermissionMessage(null);
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

        const requestGeneration = permissionRequestGeneration.current + 1;
        permissionRequestGeneration.current = requestGeneration;
        setCameraPermissionMessage(null);

        if (cameraPermission?.granted) {
            setScannerOpen(true);
            return;
        }

        setRequestingCamera(true);
        try {
            const permission = await requestCameraPermission();
            if (requestGeneration !== permissionRequestGeneration.current) {
                return;
            }

            if (permission.granted) {
                setScannerOpen(true);
                return;
            }

            setCameraPermissionMessage(
                "Camera access wasn’t granted. Enter the code manually, or enable camera access in system settings.",
            );
        } catch {
            if (requestGeneration === permissionRequestGeneration.current) {
                setCameraPermissionMessage(
                    "Camera access couldn’t be requested. Enter the code manually instead.",
                );
            }
        } finally {
            if (requestGeneration === permissionRequestGeneration.current) {
                setRequestingCamera(false);
            }
        }
    }, [cameraPermission?.granted, isFocused, requestCameraPermission]);

    return {
        cameraPermissionMessage,
        closeScanner,
        openScanner,
        requestingCamera,
        scannerOpen: scannerOpen && isFocused,
    };
}
