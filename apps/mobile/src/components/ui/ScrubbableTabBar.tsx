import { CommonActions } from "expo-router/build/react-navigation";
import {
    BottomTabBar,
    type BottomTabBarProps,
} from "expo-router/build/react-navigation/bottom-tabs";
import { useEffect } from "react";
import { I18nManager } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";

import { TabBarBackground } from "./TabBarBackground";

type Props = BottomTabBarProps & { routeNames: readonly string[] };

export function ScrubbableTabBar({ routeNames, ...props }: Props) {
    const { state, navigation, descriptors } = props;
    const activeIndex = routeNames.indexOf(state.routes[state.index].name);
    const previewIndex = useSharedValue(-1);
    const width = useSharedValue(0);
    const tabCount = routeNames.length;
    const isRTL = I18nManager.isRTL;

    useEffect(() => {
        // Navigation (including Back and deep links) owns the settled selection.
        previewIndex.set(-1);
    }, [state, previewIndex]);

    const finishScrub = (index: number) => {
        const route = state.routes.find(
            (candidate) => candidate.name === routeNames[index],
        );
        if (!route) {
            previewIndex.set(-1);
            return;
        }
        const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
        });
        if (
            route.key === state.routes[state.index].key ||
            event.defaultPrevented
        ) {
            previewIndex.set(-1);
            return;
        }
        navigation.dispatch({
            ...CommonActions.navigate(route),
            target: state.key,
        });
        // Keep the preview until navigation commits, avoiding a flash back to the old tab.
    };

    const nearestTab = (x: number) => {
        "worklet";
        // The measured background excludes the capsule's 8px padding on each side.
        const visualIndex = Math.min(
            tabCount - 1,
            Math.max(0, Math.floor(((x - 8) / width.get()) * tabCount)),
        );
        return isRTL ? tabCount - 1 - visualIndex : visualIndex;
    };

    const scrub = Gesture.Pan()
        .manualActivation(true)
        .maxPointers(1)
        .shouldCancelWhenOutside(false)
        .onTouchesDown((_event, manager) => {
            // Activate on contact, even for a stationary tap with no MOVE event.
            manager.activate();
        })
        .onBegin((event) => {
            if (width.get() > 0) previewIndex.set(nearestTab(event.x));
        })
        .onUpdate((event) => {
            if (width.get() > 0) previewIndex.set(nearestTab(event.x));
        })
        .onEnd((event, success) => {
            if (success && width.get() > 0) {
                runOnJS(finishScrub)(nearestTab(event.x));
            }
        })
        .onFinalize((_event, success) => {
            // Interrupted touches must never navigate.
            if (!success) previewIndex.set(-1);
        });

    const background = () => (
        <TabBarBackground
            activeIndex={activeIndex}
            previewIndex={previewIndex}
            width={width}
            tabCount={tabCount}
        />
    );

    return (
        <GestureDetector gesture={scrub}>
            <BottomTabBar
                {...props}
                descriptors={Object.fromEntries(
                    Object.entries(descriptors).map(([key, descriptor]) => [
                        key,
                        {
                            ...descriptor,
                            options: {
                                ...descriptor.options,
                                tabBarBackground: background,
                            },
                        },
                    ]),
                )}
            />
        </GestureDetector>
    );
}
