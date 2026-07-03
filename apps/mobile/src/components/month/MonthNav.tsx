import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import React from "react";

interface Props {
    label: string;
    onPrev?: () => void;
    onNext?: () => void;
}

export function MonthNav({ label, onPrev, onNext }: Props) {
    return (
        <View className="my-2 mb-3 flex-row items-center justify-between">
            <NavButton onPress={onPrev}>
                <Icon name="chevron-left" />
            </NavButton>

            <Text className="text-[17px] font-semibold text-ink">{label}</Text>

            <NavButton onPress={onNext}>
                <Icon name="chevron-right" />
            </NavButton>
        </View>
    );
}

const NavButton = (props: React.ComponentProps<typeof Pressable>) => (
    <Pressable
        {...props}
        className={cn(
            "elevation-sm rounded-xl bg-surface p-2",
            props.className,
        )}
    >
        {props.children}
    </Pressable>
);
