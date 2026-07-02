import { Text, View } from "react-native";

interface Props {
    value: string | number;
    label: string;
}

export function StatCard({ value, label }: Props) {
    return (
        <View className="flex-1 rounded-field bg-surface px-3.5 py-3 shadow-sm">
            <Text className="text-[22px] font-bold tracking-tight text-ink">
                {value}
            </Text>
            <Text className="text-xs text-ink-2">{label}</Text>
        </View>
    );
}
