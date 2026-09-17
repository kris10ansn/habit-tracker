import { Text, View } from "react-native";

export function SectionHeader({
    title,
    detail,
}: {
    title: string;
    detail?: string;
}) {
    return (
        <View className="mb-3 mt-6 flex-row flex-wrap items-baseline justify-between gap-2 px-1">
            <Text
                accessibilityRole="header"
                className="text-[17px] font-semibold tracking-tight text-ink"
            >
                {title}
            </Text>
            {detail ? (
                <Text className="text-xs text-ink-2">{detail}</Text>
            ) : null}
        </View>
    );
}
