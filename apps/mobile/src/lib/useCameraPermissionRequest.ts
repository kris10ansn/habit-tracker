import { useCameraPermissions } from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";

type CameraPermissionRequestOutcome =
    | "granted"
    | "denied"
    | "error"
    | "cancelled";

export function useCameraPermissionRequest() {
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [requesting, setRequesting] = useState(false);
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

            if (cameraPermission?.granted) {
                return "granted";
            }

            setRequesting(true);
            try {
                const permission = await requestCameraPermission();
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
        }, [cameraPermission?.granted, requestCameraPermission]);

    return {
        cancelPendingRequest,
        requestPermission,
        requesting,
    };
}
