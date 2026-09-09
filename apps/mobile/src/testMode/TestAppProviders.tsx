import "./installGlobals";

import { useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";
import { useEffect, useState, type ReactNode } from "react";

import { AppProviders as ProductionAppProviders } from "../components/AppProviders";
import { prepareTestData } from "./prepareTestData";

let preparation: Promise<void> | undefined;

function prepareOnce(database: SQLiteDatabase): Promise<void> {
    preparation ??= prepareTestData(database);
    return preparation;
}

function TestDataGate({ children }: { children: ReactNode }) {
    const database = useSQLiteContext();
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<unknown>();

    useEffect(() => {
        let active = true;

        prepareOnce(database)
            .then(() => {
                if (!active) return;
                console.info("TEST_MODE_READY");
                setReady(true);
            })
            .catch((preparationError: unknown) => {
                if (active) setError(preparationError);
            });

        return () => {
            active = false;
        };
    }, [database]);

    if (error) throw error;
    return ready ? <>{children}</> : null;
}

// Metro substitutes this adapter only in the isolated test target. The production provider still
// owns migrations and the full provider stack; this gate runs only after that provider is ready.
export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <ProductionAppProviders>
            <TestDataGate>{children}</TestDataGate>
        </ProductionAppProviders>
    );
}
