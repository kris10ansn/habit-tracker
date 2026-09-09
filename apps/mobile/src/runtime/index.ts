import { productionRuntime } from "./production";
import type { AppRuntime } from "./types";

export let appRuntime: AppRuntime = productionRuntime;

// The custom test entry calls this before Expo Router imports any application modules.
export function installAppRuntime(runtime: AppRuntime): void {
    appRuntime = runtime;
}
