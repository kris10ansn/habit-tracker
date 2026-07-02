import { Pressable, Text, View } from "react-native";

import { cn } from "@/lib/cn";

interface Props {
    negative: boolean;
    onChange?: (negative: boolean) => void;
}

interface SegmentProps {
    label: string;
    active: boolean;
    onPress?: () => void;
}

function Segment({ label, active, onPress }: SegmentProps) {
    return (
        <Pressable
            onPress={onPress}
            className={cn("px-2.5 py-1", active && "bg-accent")}
        >
            <Text
                className={cn(
                    "text-[11px] font-semibold",
                    active ? "text-white" : "text-ink-2",
                )}
            >
                {label}
            </Text>
        </Pressable>
    );
}

// Positive / Negative segmented control (habit polarity).
export function PolarityToggle({ negative, onChange }: Props) {
    return (
        <View className="flex-row self-start overflow-hidden rounded-full border border-line">
            <Segment
                label="Positive"
                active={!negative}
                onPress={() => onChange?.(false)}
            />
            <Segment
                label="Negative"
                active={negative}
                onPress={() => onChange?.(true)}
            />
        </View>
    );
}
