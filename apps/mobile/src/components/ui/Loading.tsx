import { ActivityIndicator, View } from "react-native";

import { useColors } from "@/theme/colors";

// Centered spinner for a screen still waiting on its first query.
export function Loading() {
    const colors = useColors();
    return (
        <View className="items-center justify-center py-16">
            <ActivityIndicator color={colors.accent} />
        </View>
    );
}
