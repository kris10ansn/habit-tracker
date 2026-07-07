import { AddHabitRow } from "@/components/habits/AddHabitRow";
import { EditHabitRow } from "@/components/habits/EditHabitRow";
import { AppScreen } from "@/components/ui/AppScreen";
import { Card } from "@/components/ui/Card";
import { CommunityIcon } from "@/components/ui/Icon";
import { SortableList, SortableListHandle } from "@/components/ui/SortableList";
import { Habit } from "@/domain/types";
import { useHabits } from "@/state/HabitsProvider";

export default function HabitsScreen() {
    const { habits, reorderHabit } = useHabits();

    return (
        <AppScreen
            eyebrow="Manage"
            title="Habits"
            subtitle="Rename, reorder, set polarity, or add"
        >
            <SortableList
                items={habits}
                keyOf={(habit) => habit.id}
                onReorder={reorderHabit}
                renderRow={HabitRow}
                rowClassName="pb-2.5"
            />

            <AddHabitRow />
        </AppScreen>
    );
}

const HabitRow = (habit: Habit) => (
    <Card className="flex-row items-center gap-3">
        <SortableListHandle className="-m-3 p-3">
            <CommunityIcon name="drag" />
        </SortableListHandle>

        <EditHabitRow habit={habit} />
    </Card>
);
