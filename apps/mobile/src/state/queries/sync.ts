import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, NetworkError } from "@/api/client";
import { postApiSync } from "@/api/gen";
import { useDatabase } from "@/db/client";
import * as repo from "@/db/repo";
import { updateSettings } from "@/db/repo/settings";
import { monthKey } from "@/domain/dates";

import { useSettings } from "@/state/queries/settings";
import {
    entriesKey,
    habitsKey,
    settingsKey,
    streaksKey,
    unsyncedChangesKey,
} from "./keys";

export function useHasUnsyncedChanges(lastSyncedAt: number | null) {
    const db = useDatabase();

    return useQuery({
        queryKey: [...unsyncedChangesKey, lastSyncedAt],
        queryFn: () =>
            lastSyncedAt === null
                ? false
                : repo.hasUnsyncedChanges(db, lastSyncedAt),
        staleTime: Infinity,
    });
}

/**
 * One sync round-trip: gather local state, POST it, overwrite local with the authoritative result.
 *
 * The three steps are deliberately not interleaved. `syncStartedAt` is stamped before the gather
 * and carried through to the apply, so anything the user edits while the request is in flight is
 * recognisable as "never submitted" and survives (see repo/sync.ts).
 *
 * Merge is the backend's job — nothing here resolves a conflict, and this is the only place mobile
 * talks to the network at all.
 */
export function useSync() {
    const db = useDatabase();
    const queryClient = useQueryClient();

    const settings = useSettings();

    return useMutation({
        mutationFn: async (variables: { currentMonthKey?: string }) => {
            const baseURL = settings.data?.syncServerUrl.trim() ?? "";

            if (!baseURL) {
                throw new Error(
                    "No Server URL set — the app is standalone. Set one on the Sync tab first.",
                );
            }

            const now = new Date();
            const currentMonthKey =
                variables.currentMonthKey ??
                monthKey(now.getFullYear(), now.getMonth());

            const syncStartedAt = Date.now();
            const monthKeys = await repo.monthsToSync(
                db,
                currentMonthKey,
                settings.data?.lastSyncedAt ?? null,
            );

            const request = await repo.gatherRequest(db, monthKeys);
            const response = await postApiSync(request, { baseURL });

            await repo.applySynced(db, response, monthKeys, syncStartedAt);
            await updateSettings(db, { lastSyncedAt: syncStartedAt });

            return { monthKeys, syncedAt: syncStartedAt };
        },

        onSuccess: ({ monthKeys }) => {
            // A sync rewrites the roster and every synced month, so nothing cached survives it.
            queryClient.invalidateQueries({ queryKey: habitsKey });
            queryClient.invalidateQueries({ queryKey: streaksKey });
            queryClient.invalidateQueries({ queryKey: settingsKey });
            monthKeys.forEach((month) =>
                queryClient.invalidateQueries({ queryKey: entriesKey(month) }),
            );
        },
    });
}

/** Transport failures are local; server rejections already carry their own user-safe message. */
export function syncErrorReason(error: unknown): string {
    if (error instanceof NetworkError) {
        return "Couldn't reach the server — check the URL and your connection.";
    }

    if (error instanceof ApiError) {
        return error.message;
    }

    return error instanceof Error ? error.message : "Something went wrong.";
}
