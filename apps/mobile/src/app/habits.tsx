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
                <EditHabitRow
                    key={habit.name}
                    habit={habit}
                    isFirst={i === 0}
                    isLast={i === habits.length - 1}
                />
            ))}
            <AddHabitRow />
        </AppScreen>
    );
}
