import { Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

interface Props {
    logged: number;
    total: number;
    slips: number;
}

export function DaySummary({ logged, total, slips }: Props) {
    const segmentCount = Math.min(total, 12);
    const filledSegments =
        total > 0 ? Math.round((logged / total) * segmentCount) : 0;
    return (
        <Card className="border-accent-deep bg-accent-deep p-4">
            <View className="flex-row items-center justify-between">
                <Text className="text-[10px] font-bold uppercase tracking-[2px] text-accent-muted">
                    Daily progress
                </Text>
                <Icon
                    name="auto-awesome"
                    size={18}
                    className="text-accent-muted"
                />
            </View>
            <View className="mt-3 flex-row items-end justify-between gap-4">
                <View className="flex-1">
                    <Text className="text-[36px] font-semibold tracking-tight text-white">
                        {logged}
                        <Text className="text-[22px] font-normal text-accent-muted">
                            {" "}
                            / {total}
                        </Text>
                    </Text>
                    <Text className="mt-1 text-[13px] text-accent-muted">
                        logged today
                    </Text>
                </View>
                <View className="rounded-field bg-white/10 px-4 py-3">
                    <Text className="text-xl font-semibold text-white">
                        {slips}
                    </Text>
                    <Text className="mt-0.5 text-xs text-accent-muted">
                        {slips === 1 ? "slip-up" : "slip-ups"}
                    </Text>
                </View>
            </View>
            {total > 0 ? (
                <View
                    accessibilityRole="progressbar"
                    accessibilityLabel="Habits logged today"
                    accessibilityValue={{ min: 0, max: total, now: logged }}
                    className="mt-4 flex-row gap-1.5"
                >
                    {Array.from({ length: segmentCount }, (_, index) => (
                        <View
                            key={index}
                            className={cn(
                                "h-1.5 flex-1 rounded-full",
                                index < filledSegments
                                    ? "bg-accent-muted"
                                    : "bg-white/15",
                            )}
                        />
                    ))}
                </View>
            ) : null}
        </Card>
    );
}
