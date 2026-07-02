import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

interface Props {
  online: boolean;
  lastSynced?: string;
}

// Ambient sync state + a manual trigger. `online` false is the standalone state
// (no Server URL set) — the app runs fully local and makes no sync attempts.
export function SyncStatusCard({ online, lastSynced }: Props) {
  return (
    <Card className="mb-3">
      <View className="flex-row items-center gap-3">
        <View className={cn('h-2.5 w-2.5 rounded-full', online ? 'bg-done' : 'bg-ink-3')} />
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-ink">
            {online ? 'Up to date' : 'Standalone'}
          </Text>
          <Text className="text-[12.5px] text-ink-2">
            {online ? `Last synced ${lastSynced}` : 'Running fully on this device'}
          </Text>
        </View>
      </View>
      <Button label="Sync now" disabled={!online} className="mt-3.5" />
    </Card>
  );
}
