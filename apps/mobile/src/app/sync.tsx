import { SyncStatusCard } from "@/components/sync/SyncStatusCard";
import { AppScreen } from "@/components/ui/AppScreen";
import { Card } from "@/components/ui/Card";
import {
    TextInputField,
    TextInputHint,
    TextInputLabel,
} from "@/components/ui/TextField";
import { useUpdateEffect } from "@/lib/useUpdateEffect";
import { useSettings, useUpdateSettings } from "@/state/queries/settings";
import { useState } from "react";
import { View } from "react-native";

// Sync: point the app at a backend, or stay standalone with an empty Server URL.
export default function SyncScreen() {
    const settings = useSettings();
    const updateSettings = useUpdateSettings();

    const [syncServerUrl, setSyncServerUrl] = useState(
        settings.data?.syncServerUrl ?? "",
    );

    useUpdateEffect(() => {
        if (settings.data != undefined) {
            setSyncServerUrl(settings.data.syncServerUrl);
        }
    }, [settings.data]);

    const updateSyncSettingsUrl = () => {
        updateSettings.mutate({ syncServerUrl });
    };

    return (
        <AppScreen
            eyebrow="Backend"
            title="Sync"
            subtitle="Keep every device in step"
        >
            <SyncStatusCard online lastSynced="2 min ago" />

            <Card className="flex-col">
                <TextInputLabel>Server URL</TextInputLabel>

                <View className="flex-row gap-4">
                    <View className="flex-1 flex-col">
                        <TextInputField
                            value={syncServerUrl}
                            onChangeText={setSyncServerUrl}
                            placeholder="https://example.com"
                            editable={!settings.isFetching}
                            inputMode="url"
                            autoCapitalize="none"
                            onBlur={updateSyncSettingsUrl}
                        />
                        <TextInputHint>
                            Syncs habits across your devices.
                        </TextInputHint>
                    </View>
                </View>
            </Card>
        </AppScreen>
    );
}
