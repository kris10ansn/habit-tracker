import { Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { SlideTransition } from "@/components/ui/SlideTransition";

interface Props {
    label: string;
    direction: number;
    onPrev?: () => void;
    onNext?: () => void;
}

export function MonthNav({ label, direction, onPrev, onNext }: Props) {
    return (
        <Card className="mb-4 flex-row items-center gap-2 p-2">
            <IconButton
                icon="chevron-left"
                accessibilityLabel="Previous month"
                onPress={onPrev}
                className="border-0 bg-surface-2"
            />
            <View className="flex-1 items-center">
                <SlideTransition
                    transitionKey={label}
                    direction={direction}
                    distance={20}
                    fade
                >
                    <Text className="text-[17px] font-semibold tracking-tight text-ink">
                        {label}
                    </Text>
                </SlideTransition>
            </View>
            <IconButton
                icon="chevron-right"
                accessibilityLabel="Next month"
                onPress={onNext}
                className="border-0 bg-surface-2"
            />
        </Card>
    );
}
