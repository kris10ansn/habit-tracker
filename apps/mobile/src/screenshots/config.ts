import type { AuthSession } from "@/auth/session";

import { screenshotFixture } from "./fixture.generated";

export const screenshotMode =
    process.env.EXPO_PUBLIC_README_SCREENSHOTS === "1";

export const screenshotDatabaseName = screenshotMode
    ? "habits-readme-screenshots.db"
    : "habits.db";

export function currentDate(): Date {
    return screenshotMode ? new Date(screenshotFixture.now) : new Date();
}

export function currentTime(): number {
    return screenshotMode ? screenshotFixture.now : Date.now();
}

export function screenshotAuthSession(): AuthSession | null {
    return screenshotMode
        ? {
              token: "readme-screenshot-fixture-token",
              user: screenshotFixture.user,
          }
        : null;
}

export function initialPairingCode(): string {
    return screenshotMode ? screenshotFixture.pairing.code : "";
}

export function assertNetworkAllowed(): void {
    if (screenshotMode) {
        throw new Error(
            "README screenshot mode blocks all backend network requests",
        );
    }
}
