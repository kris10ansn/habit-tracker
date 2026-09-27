import { Redirect } from "expo-router";

// Preserve existing links to the former Sync tab.
export default function SyncRedirect() {
    return <Redirect href="/settings" />;
}
