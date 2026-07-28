import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { twMerge } from "tailwind-merge";

interface Props {
    online: boolean;
    lastSynced?: string;
}

// Ambient sync state + a manual trigger. `online` false is the standalone state
// (no Server URL set) — the app runs fully local and makes no sync attempts.
export function SyncStatusCard({ online, lastSynced }: Props) {
    return (
        <Card className="mb-3">
            <View className="flex-row items-center gap-3">
                <View
                    className={twMerge(
                        "h-2.5 w-2.5 rounded-full",
                        online ? "bg-done" : "bg-ink-3",
                    )}
                />
                <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-ink">
                        {online ? "Up to date" : "Standalone"}
                    </Text>
                    <Text className="text-[12.5px] text-ink-2">
                        {online
                            ? `Last synced ${lastSynced}`
                            : "Running fully on this device"}
                    </Text>
                </View>
            </View>
            <Button disabled={!online} className="mt-3.5">
                <View className="flex-row items-center justify-center gap-2">
                    <Icon name="sync" className="text-white" />
                    <Text className="text-white">Sync now</Text>
                </View>
            </Button>
        </Card>
    );
}
