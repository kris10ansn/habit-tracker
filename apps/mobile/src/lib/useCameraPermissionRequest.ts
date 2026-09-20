import { useCameraPermissions } from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";

type CameraPermissionRequestOutcome =
    | "granted"
    | "denied"
    | "error"
    | "cancelled";

export function useCameraPermissionRequest() {
    const [cameraPermission, requestCameraPermission, getCameraPermission] =
        useCameraPermissions({ get: false });
    // The caller starts the initial check when its screen becomes focused.
    const [requesting, setRequesting] = useState(true);
    const requestGeneration = useRef(0);

    // Native permission prompts cannot be dismissed programmatically. Cancelling invalidates the
    // eventual result so callers can safely leave while a prompt is still open.
    const cancelPendingRequest = useCallback(() => {
        requestGeneration.current += 1;
        setRequesting(false);
    }, []);

    useEffect(() => {
        return () => {
            requestGeneration.current += 1;
        };
    }, []);

    const requestPermission =
        useCallback(async (): Promise<CameraPermissionRequestOutcome> => {
            const currentRequestGeneration = requestGeneration.current + 1;
            requestGeneration.current = currentRequestGeneration;

            setRequesting(true);
            try {
                // Access may have changed in Settings since the last render.
                let permission = await getCameraPermission();
                if (currentRequestGeneration !== requestGeneration.current) {
                    return "cancelled";
                }

                if (!permission.granted && permission.canAskAgain) {
                    permission = await requestCameraPermission();
                }

                if (currentRequestGeneration !== requestGeneration.current) {
                    return "cancelled";
                }

                return permission.granted ? "granted" : "denied";
            } catch {
                return currentRequestGeneration === requestGeneration.current
                    ? "error"
                    : "cancelled";
            } finally {
                if (currentRequestGeneration === requestGeneration.current) {
                    setRequesting(false);
                }
            }
        }, [getCameraPermission, requestCameraPermission]);

    const refreshPermission = useCallback(async () => {
        await getCameraPermission();
    }, [getCameraPermission]);

    return {
        cancelPendingRequest,
        hasCameraPermission: cameraPermission?.granted === true,
        needsCameraSettings: cameraPermission?.canAskAgain === false,
        refreshPermission,
        requestPermission,
        requesting,
    };
}
