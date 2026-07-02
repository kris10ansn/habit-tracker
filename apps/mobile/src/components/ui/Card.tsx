import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "@/lib/cn";

interface Props {
    children: ReactNode;
    className?: string;
}

// The app's one surface primitive: rounded white panel with a soft shadow.
// Layout (flex-row, gaps, margins) is passed in by the caller via className.
export function Card({ children, className }: Props) {
    return (
        <View
            className={cn(
                "rounded-card bg-surface px-4 py-3.5 shadow-sm",
                className,
            )}
        >
            {children}
        </View>
    );
}
