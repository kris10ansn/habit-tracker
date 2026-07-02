import { Pressable, Text, View } from "react-native";

import { cn } from "@/lib/cn";

interface Props {
    negative: boolean;
    onChange?: (negative: boolean) => void;
}

export function PolarityToggle({ negative, onChange }: Props) {
    return (
        <Pressable
            onPress={() => onChange?.(!negative)}
            className="flex-row self-start overflow-hidden rounded-full border border-line"
        >
            <View className={cn("px-2.5 py-1", !negative && "bg-accent")}>
                <Text
                    className={cn(
                        "text-sm font-semibold",
                        !negative ? "text-white" : "text-ink-2",
                    )}
                >
                    Positive
                </Text>
            </View>
            <View className={cn("px-2.5 py-1", negative && "bg-accent")}>
                <Text
                    className={cn(
                        "text-sm font-semibold",
                        negative ? "text-white" : "text-ink-2",
                    )}
                >
                    Negative
                </Text>
            </View>
        </Pressable>
    );
}
