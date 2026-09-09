import type { UserDto } from "@/api/gen";
import { appRuntime } from "@/runtime";

// The only public session module. Production persists through SecureStore; test mode supplies an
// in-memory adapter. The bearer token deliberately remains separate from local habit data so an
// auth failure never deletes or rewrites SQLite records.

export type AuthSession = {
    token: string;
    user: UserDto;
};

export async function getAuthSession(): Promise<AuthSession | null> {
    return appRuntime.sessionStore.get();
}

export async function setAuthSession(session: AuthSession): Promise<void> {
    await appRuntime.sessionStore.set(session);
}

export async function clearAuthSession(): Promise<void> {
    await appRuntime.sessionStore.clear();
}
