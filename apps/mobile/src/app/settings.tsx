import { AppearanceSetting } from "@/components/settings/AppearanceSetting";
import { SyncStatusCard } from "@/components/sync/SyncStatusCard";
import { AppScreen } from "@/components/ui/AppScreen";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
    TextInputField,
    TextInputHint,
    TextInputLabel,
} from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/relativeTime";
import { useUpdateEffect } from "@/lib/useUpdateEffect";
import {
    useHasUnsyncedChanges,
    useSettings,
    useSync,
    useUpdateSettings,
} from "@/state/queries";
import { useState } from "react";
import { Text, View } from "react-native";

import { AccountSection } from "@/components/account/AccountSection";

import type { SyncState } from "@/components/sync/SyncStatusCard";

// Device preferences and the existing standalone/account/sync controls.
export default function SettingsScreen() {
    const settings = useSettings();
    const updateSettings = useUpdateSettings();
    const sync = useSync();

    const savedSyncServerUrl = settings.data?.syncServerUrl ?? "";
    const [syncServerUrl, setSyncServerUrl] = useState(savedSyncServerUrl);

    useUpdateEffect(() => {
        setSyncServerUrl(savedSyncServerUrl);
    }, [savedSyncServerUrl]);

    // Saving is explicit: Android's back button dismisses the keyboard without blurring the input,
    // so an on-blur save silently skipped the most common way of leaving the field.
    const hasUnsavedServerUrl = syncServerUrl !== savedSyncServerUrl;

    const updateSyncSettingsUrl = () => {
        if (!hasUnsavedServerUrl) return;

        // A different backend has different history, so a stale lastSyncedAt would make the next
        // sync a silently-partial incremental one instead of the full one it needs to be.
        updateSettings.mutate({ syncServerUrl, lastSyncedAt: null });
    };

    const lastSyncedAt = settings.data?.lastSyncedAt ?? null;
    const unsyncedChanges = useHasUnsyncedChanges(lastSyncedAt);

    const state = syncState({
        savedServerUrl: settings.data?.syncServerUrl ?? "",
        lastSyncedAt,
        hasUnsyncedChanges: unsyncedChanges.data ?? false,
        isSyncing: sync.isPending,
        failed: sync.isError,
    });

    return (
        <AppScreen
            eyebrow="Preferences"
            title="Settings"
            subtitle="Make yourself at home"
            avoidKeyboard
        >
            <SectionHeader title="Appearance" />
            <AppearanceSetting
                value={settings.data?.appearance ?? "system"}
                disabled={
                    !settings.data ||
                    settings.isFetching ||
                    updateSettings.isPending
                }
                onChange={(appearance) => updateSettings.mutate({ appearance })}
            />

            <SectionHeader title="Sync" />
            <SyncStatusCard
                state={state}
                lastSynced={relativeTime(lastSyncedAt)}
                errorMessage={sync.isError ? sync.error.message : undefined}
                onSyncNow={() => sync.mutate({})}
            />

            <SectionHeader title="Connection" />
            <Card className="flex-col">
                <TextInputLabel>Server URL</TextInputLabel>

                <View className="flex-col">
                    <View className="flex-row items-start gap-3">
                        <TextInputField
                            className="flex-1"
                            value={syncServerUrl}
                            onChangeText={setSyncServerUrl}
                            placeholder="https://example.com"
                            editable={!settings.isFetching}
                            inputMode="url"
                            autoCapitalize="none"
                            autoComplete="off"
                            importantForAutofill="no"
                            textContentType="URL"
                            onSubmitEditing={updateSyncSettingsUrl}
                        />
                        <Button
                            label={
                                updateSettings.isPending ? "Saving…" : "Save"
                            }
                            disabled={
                                !hasUnsavedServerUrl || updateSettings.isPending
                            }
                            onPress={updateSyncSettingsUrl}
                            className="px-5 py-3.5"
                        />
                    </View>
                    <TextInputHint
                        className={cn(hasUnsavedServerUrl && "text-slip")}
                    >
                        {hasUnsavedServerUrl
                            ? "Unsaved change — tap Save to apply it."
                            : "Syncs habits across your devices."}
                    </TextInputHint>
                </View>
            </Card>

            {updateSettings.isError ? (
                <Text
                    accessibilityRole="alert"
                    className="mt-3 text-sm text-slip"
                >
                    Could not save settings. Please try again.
                </Text>
            ) : null}

            <SectionHeader title="Account" />
            <AccountSection />
        </AppScreen>
    );
}

// An empty Server URL is the standalone case and outranks everything — there is nothing to be out
// of date with. Otherwise a failure outranks a success, since the last error is what the user needs
// to act on, and "never synced" reads as not-synced rather than as up-to-date.
function syncState(status: {
    savedServerUrl: string;
    lastSyncedAt: number | null;
    hasUnsyncedChanges: boolean;
    isSyncing: boolean;
    failed: boolean;
}): SyncState {
    if (!status.savedServerUrl) return "standalone";
    if (status.isSyncing) return "syncing";
    if (status.failed) return "error";
    if (status.lastSyncedAt === null) return "not-synced";
    if (status.hasUnsyncedChanges) return "dirty";

    return "connected";
}
