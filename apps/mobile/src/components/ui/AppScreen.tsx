import { cssInterop } from "nativewind";
import type { ReactNode } from "react";
import { RefreshControlProps, ScrollView, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "./ScreenHeader";

// SafeAreaView is third-party, so NativeWind needs to map `className` onto its
// `style` prop. Registered once here since AppScreen owns the safe area.
cssInterop(SafeAreaView, { className: "style" });
// Same for the keyboard-aware scroll view — map both the scroll style and its
// content container so it stays a drop-in for ScrollView.
cssInterop(KeyboardAwareScrollView, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
});

type AppScreenProps = {
    title: string;
    eyebrow?: string;
    subtitle?: string;
    // Forwarded to ScreenHeader — set on pushed (non-tab) screens. See ScreenHeader's own doc.
    onBack?: () => void;
    scroll?: boolean;
    // Scroll a focused input above the keyboard (e.g. the add-habit row at the
    // bottom of the Habits list). Uses react-native-keyboard-controller, which
    // also handles Android edge-to-edge, where the OS window no longer resizes.
    avoidKeyboard?: boolean;
    children: ReactNode;
    refreshControl?: React.ReactElement<RefreshControlProps> | undefined;
};

// Page scaffold shared by every tab: safe-area frame, header, and a body that
// either scrolls (default) or fills. Scroll content extends behind the floating
// tab bar, with clearance only at the end so the last row remains reachable.
export function AppScreen({
    title,
    eyebrow,
    subtitle,
    onBack,
    scroll = true,
    avoidKeyboard = false,
    children,
    refreshControl,
}: AppScreenProps) {
    return (
        <SafeAreaView
            className="flex-1 bg-surface-2"
            edges={["top", "left", "right"]}
        >
            <ScreenHeader
                eyebrow={eyebrow}
                title={title}
                subtitle={subtitle}
                onBack={onBack}
            />
            {scroll ? (
                avoidKeyboard ? (
                    <KeyboardAwareScrollView
                        className="flex-1"
                        contentContainerClassName="px-5 pb-8"
                        keyboardShouldPersistTaps="handled"
                        bottomOffset={16}
                        refreshControl={refreshControl}
                    >
                        {children}
                        <TabBarClearance />
                    </KeyboardAwareScrollView>
                ) : (
                    <ScrollView
                        className="flex-1"
                        contentContainerClassName="px-5 pb-8"
                        refreshControl={refreshControl}
                    >
                        {children}
                        <TabBarClearance />
                    </ScrollView>
                )
            ) : (
                // A screen with its own scroll view owns its scroll-end clearance.
                <View className="flex-1 px-5">{children}</View>
            )}
        </SafeAreaView>
    );
}

// This spacer scrolls with the content instead of masking it with a fixed footer.
// Include the home-indicator inset and room for the capsule at larger text sizes.
export function TabBarClearance() {
    return (
        <SafeAreaView
            className="pt-28"
            edges={["bottom"]}
            pointerEvents="none"
        />
    );
}
