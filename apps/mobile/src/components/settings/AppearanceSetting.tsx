import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Icon, type MaterialIconName } from "@/components/ui/Icon";
import type { SettingsPatch } from "@/db/repo/settings";
import { cn } from "@/lib/cn";

type AppearancePreference = NonNullable<SettingsPatch["appearance"]>;

const choices: {
    value: AppearancePreference;
    label: string;
    icon: MaterialIconName;
}[] = [
    { value: "system", label: "System", icon: "brightness-auto" },
    { value: "light", label: "Light", icon: "light-mode" },
    { value: "dark", label: "Dark", icon: "dark-mode" },
];

export function AppearanceSetting({
    value,
    onChange,
    disabled,
}: {
    value: AppearancePreference;
    onChange: (value: AppearancePreference) => void;
    disabled: boolean;
}) {
    return (
        <Card className="gap-3">
            <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Appearance"
                className="flex-row gap-2"
            >
                {choices.map((choice) => {
                    const selected = value === choice.value;
                    return (
                        <Pressable
                            key={choice.value}
                            testID={`appearance-${choice.value}`}
                            accessibilityRole="radio"
                            accessibilityLabel={choice.label}
                            accessibilityState={{ checked: selected, disabled }}
                            disabled={disabled}
                            onPress={() => {
                                if (!selected) onChange(choice.value);
                            }}
                            className={cn(
                                "min-h-[72px] flex-1 items-center justify-center gap-2 rounded-field px-2 py-3 active:opacity-70",
                                selected ? "bg-accent-soft" : "bg-surface-2",
                                disabled && "opacity-50",
                            )}
                        >
                            <Icon
                                name={choice.icon}
                                size={22}
                                className={
                                    selected ? "text-accent" : "text-ink-2"
                                }
                            />
                            <Text
                                className={cn(
                                    "text-sm font-semibold",
                                    selected ? "text-accent" : "text-ink-2",
                                )}
                            >
                                {choice.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
            <Text className="text-sm text-ink-2">
                {value === "system"
                    ? "Follows your device’s light or dark mode."
                    : "Only changes the appearance on this device."}
            </Text>
        </Card>
    );
}
