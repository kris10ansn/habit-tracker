import type { PairingRequestInfo, SessionDto, UserDto } from "@/api/gen";
import type { Entry, Habit } from "@/domain/types";

export interface ScreenshotFixture {
    today: string;
    now: number;
    settings: {
        syncServerUrl: string;
        lastSyncedAt: number;
        showPrivateHabits: boolean;
        suspendImageEnabled: boolean;
    };
    user: UserDto;
    pairing: PairingRequestInfo & { code: string };
    sessions: SessionDto[];
    habits: Habit[];
    entries: Entry[];
}
