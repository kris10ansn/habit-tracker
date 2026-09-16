import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/Icon";

interface Props {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    // Set on screens reached by pushing a route rather than a tab (e.g. the linked-devices and
    // link-a-device screens) — tabs never pass this, so their header is unchanged.
    onBack?: () => void;
}

// The in-app page header (the native nav header is hidden). Shared by every tab
// so titles line up across screens.
export function ScreenHeader({ eyebrow, title, subtitle, onBack }: Props) {
    return (
        <View className="flex-row items-start gap-3 px-5 pb-6 pt-5">
            {onBack ? (
                <Pressable
                    onPress={onBack}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    className="mt-1 h-[44px] w-[44px] items-center justify-center rounded-full border border-line bg-surface active:bg-accent-soft"
                >
                    <Icon name="arrow-back" size={20} className="text-ink-2" />
                </Pressable>
            ) : null}
            <View className="flex-1">
                {eyebrow ? (
                    <Text className="text-[10px] font-bold uppercase tracking-[2px] text-accent">
                        {eyebrow}
                    </Text>
                ) : null}
                <Text className="mt-2 text-[34px] font-bold tracking-tight text-ink">
                    {title}
                </Text>
                {subtitle ? (
                    <Text className="mt-1.5 text-[13px] leading-5 text-ink-2">
                        {subtitle}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}
