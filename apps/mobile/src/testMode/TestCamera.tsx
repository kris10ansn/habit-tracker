import {
    createPermissionHook,
    PermissionStatus,
    type PermissionResponse,
} from "expo";
import type { CameraViewProps } from "expo-camera";
import { Image, View } from "react-native";

const cameraPermission: PermissionResponse = {
    status: PermissionStatus.GRANTED,
    granted: true,
    canAskAgain: true,
    expires: "never",
};

async function getCameraPermission() {
    return cameraPermission;
}

export const useCameraPermissions = createPermissionHook({
    getMethod: getCameraPermission,
    requestMethod: getCameraPermission,
});

// Keep the production scanner and its overlay, but hold the sample feed still for captures.
export function CameraView({ style }: CameraViewProps) {
    return (
        <View style={style} className="overflow-hidden">
            <Image
                source={require("./assets/pairing-camera.jpg")}
                accessibilityLabel="Example camera view of a reMarkable pairing screen"
                className="absolute left-1/2 top-1/2 -translate-x-[50%] -translate-y-[52%] scale-[0.3]"
            />
        </View>
    );
}
