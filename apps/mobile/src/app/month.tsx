import { MonthGrid } from "@/components/month/MonthGrid";
import { MonthNav } from "@/components/month/MonthNav";
import { AppScreen } from "@/components/ui/AppScreen";
import { monthGrid } from "@/domain/dates";
import { useHabits } from "@/state/HabitsProvider";

// Month: the whole grid at review scale — days down, habits across.
export default function MonthScreen() {
    const grid = monthGrid();
    const { habits, toggleEntry } = useHabits();

    return (
        <AppScreen
            eyebrow="Overview"
            title="Month"
            subtitle="Your habits across the month"
        >
            <MonthNav label={grid.monthLabel} />
            <MonthGrid habits={habits} grid={grid} onToggle={toggleEntry} />
        </AppScreen>
    );
}
