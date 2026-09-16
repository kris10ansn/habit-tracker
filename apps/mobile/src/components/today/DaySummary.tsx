import { View } from "react-native";

import { StatCard } from "@/components/ui/StatCard";

interface Props {
    logged: number;
    total: number;
    slips: number;
}

export function DaySummary({ logged, total, slips }: Props) {
    return (
        <View className="mb-4 mt-1 flex-row gap-2.5">
            <StatCard value={`${logged}/${total}`} label="logged today" />
            <StatCard
                value={slips}
                label={slips === 1 ? "slip-up" : "slip-ups"}
            />
        </View>
    );
}
