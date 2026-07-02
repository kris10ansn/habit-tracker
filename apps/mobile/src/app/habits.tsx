import { AddHabitRow } from "@/components/habits/AddHabitRow";
import { EditHabitRow } from "@/components/habits/EditHabitRow";
import { AppScreen } from "@/components/ui/AppScreen";
import { useHabits } from "@/state/HabitsProvider";

// Habits: manage the roster — rename, reorder, set polarity, add, delete.
export default function HabitsScreen() {
    const { habits } = useHabits();

    return (
        <AppScreen
            eyebrow="Manage"
            title="Habits"
            subtitle="Rename, reorder, set polarity, or add"
        >
            {habits.map((habit, i) => (
                <EditHabitRow key={i} habit={habit} />
            ))}
            <AddHabitRow />
        </AppScreen>
    );
}
