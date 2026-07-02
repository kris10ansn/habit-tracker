import { AppScreen } from '@/components/ui/AppScreen';
import { SyncStatusCard } from '@/components/sync/SyncStatusCard';
import { TextField } from '@/components/ui/TextField';

// Sync: point the app at a backend, or stay standalone with an empty Server URL.
export default function SyncScreen() {
  return (
    <AppScreen eyebrow="Backend" title="Sync" subtitle="Keep every device in step">
      <SyncStatusCard online lastSynced="2 min ago" />
      <TextField
        label="Server URL"
        value="https://habits.myserver.dev"
        placeholder="https://…"
        hint="Leave empty to stay standalone — the app runs fully local and never reaches out. Sync is last-write-wins per entry, with tombstones for deletes, so every device converges."
      />
    </AppScreen>
  );
}
