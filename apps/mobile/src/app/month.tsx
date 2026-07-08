import { useState } from "react";

import { MonthGrid } from "@/components/month/MonthGrid";
import { MonthNav } from "@/components/month/MonthNav";
import { AppScreen } from "@/components/ui/AppScreen";
import { Loading } from "@/components/ui/Loading";
import { addMonth, monthView, todayKey } from "@/domain/dates";
import {
    useHabits,
    useMonthEntries,
    useStreaks,
    useToggleEntry,
} from "@/state/queries";

// Month: the whole grid at review scale — days down, habits across. Navigable to any month;
// past and the current month are editable, future days are view-only.
export default function MonthScreen() {
    const today = todayKey();
    const [cursor, setCursor] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });
    const view = monthView(cursor.year, cursor.month);

    const habitsQuery = useHabits();
    const habits = habitsQuery.data ?? [];
    const entriesQuery = useMonthEntries(view.monthKey);
    const streaksQuery = useStreaks(habits);
    const toggle = useToggleEntry(view.monthKey);

    return (
        <AppScreen
            eyebrow="Overview"
            title="Month"
            subtitle="Your habits across the month"
        >
            <MonthNav
                label={view.monthLabel}
                onPrev={() => setCursor((c) => addMonth(c.year, c.month, -1))}
                onNext={() => setCursor((c) => addMonth(c.year, c.month, 1))}
            />
            {habitsQuery.isPending ? (
                <Loading />
            ) : (
                <MonthGrid
                    habits={habits}
                    view={view}
                    today={today}
                    entries={entriesQuery.data ?? []}
                    streaks={streaksQuery.data ?? {}}
                    onToggle={(input) => toggle.mutate(input)}
                />
            )}
        </AppScreen>
    );
}
