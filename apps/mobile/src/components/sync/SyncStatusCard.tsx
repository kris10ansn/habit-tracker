import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Icon, type MaterialIconName } from "@/components/ui/Icon";
import { colors } from "@/theme/colors";
import { twMerge } from "tailwind-merge";

export type SyncState =
    | "connected"
    | "dirty"
    | "standalone"
    | "syncing"
    | "error"
    | "not-synced";

export type SyncStatusCardProps = {
    state: SyncState;
    lastSynced?: string;
    syncDetail?: string;
    errorMessage?: string;
    onSyncNow?: () => void;
};

export type StateView = {
    icon: MaterialIconName;
    medallionClass: string;
    iconClass: string;
    dotClass: string;
    label: string;
    detail: (props: SyncStatusCardProps) => string;
    action: { label: string; enabled: boolean; busy?: boolean };
};

const stateViews: Record<SyncState, StateView> = {
    connected: {
        icon: "cloud-done",
        medallionClass: "bg-done-soft",
        iconClass: "text-done",
        dotClass: "bg-done",
        label: "No unsynced changes",
        detail: ({ lastSynced }) => `Last synced ${lastSynced}`,
        action: { label: "Sync now", enabled: true },
    },
    dirty: {
        icon: "cloud-sync",
        medallionClass: "bg-warm-soft",
        iconClass: "text-warm",
        dotClass: "bg-warm",
        label: "Changes not synced",
        detail: ({ lastSynced }) => `Last synced ${lastSynced}`,
        action: { label: "Sync now", enabled: true },
    },
    standalone: {
        icon: "cloud-off",
        medallionClass: "bg-ink-3/10",
        iconClass: "text-ink-3",
        dotClass: "bg-ink-3",
        label: "Standalone",
        detail: () => "Running fully on this device",
        action: { label: "Sync now", enabled: false },
    },
    syncing: {
        icon: "cloud-sync",
        medallionClass: "bg-accent-soft",
        iconClass: "text-accent",
        dotClass: "bg-accent",
        label: "Syncing…",
        detail: ({ syncDetail }) => syncDetail ?? "Sending changes",
        action: { label: "Syncing…", enabled: false, busy: true },
    },
    error: {
        icon: "cloud-off",
        medallionClass: "bg-slip-soft",
        iconClass: "text-slip",
        dotClass: "bg-slip",
        label: "Couldn't sync",
        detail: ({ errorMessage }) => errorMessage ?? "Check your connection",
        action: { label: "Try again", enabled: true },
    },
    ["not-synced"]: {
        icon: "cloud-sync",
        medallionClass: "bg-warm-soft",
        iconClass: "text-warm",
        dotClass: "bg-warm",
        label: "Not synced yet",
        detail: ({ lastSynced }) => `Last synced ${lastSynced}`,
        action: { label: "Sync now", enabled: true, busy: false },
    },
};

export function SyncStatusCard(props: SyncStatusCardProps) {
    const view = stateViews[props.state];

    return (
        <Card className="p-5">
            <View className="flex-row items-center gap-4">
                <View
                    className={twMerge(
                        "h-14 w-14 items-center justify-center rounded-2xl",
                        view.medallionClass,
                    )}
                >
                    <Icon
                        name={view.icon}
                        size={21}
                        className={view.iconClass}
                    />
                </View>

                <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-1.5">
                        <View
                            className={twMerge(
                                "h-[7px] w-[7px] rounded-full",
                                view.dotClass,
                            )}
                        />
                        <Text className="shrink text-[18px] font-semibold tracking-tight text-ink">
                            {view.label}
                        </Text>
                    </View>
                    <Text className="mt-1 text-[12px] leading-5 text-ink-2">
                        {view.detail(props)}
                    </Text>
                </View>
            </View>
            <View className="mt-4">
                <SyncActionPill {...view.action} onPress={props.onSyncNow} />
            </View>
        </Card>
    );
}

function SyncActionPill({
    label,
    enabled,
    busy,
    onPress,
}: StateView["action"] & { onPress?: () => void }) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !enabled }}
            onPress={onPress}
            disabled={!enabled}
            className={twMerge(
                "min-h-[48px] flex-row items-center justify-center gap-2 rounded-field px-4 py-3",
                enabled
                    ? "bg-accent active:opacity-80"
                    : "border border-line bg-surface-2",
            )}
        >
            {busy ? (
                <View className="h-[15px] w-[15px] items-center justify-center">
                    <ActivityIndicator
                        size="small"
                        color={colors.ink3}
                        className="scale-75"
                    />
                </View>
            ) : (
                <Icon
                    name="sync"
                    size={15}
                    className={enabled ? "text-white" : "text-ink-3"}
                />
            )}
            <Text
                className={twMerge(
                    "text-[13px] font-semibold",
                    enabled ? "text-white" : "text-ink-3",
                )}
            >
                {label}
            </Text>
        </Pressable>
    );
}
