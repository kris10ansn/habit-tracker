import { AppScreen } from '@/components/ui/app-screen';
import { AddHabitRow } from '@/components/habits/add-habit-row';
import { EditHabitRow } from '@/components/habits/edit-habit-row';
import { DEFAULT_HABITS } from '@/domain/habits';

// Habits: manage the roster — rename, reorder, set polarity, add, delete.
export default function HabitsScreen() {
  return (
    <AppScreen eyebrow="Manage" title="Habits" subtitle="Rename, reorder, set polarity, or add">
      {DEFAULT_HABITS.map((habit, i) => (
        <EditHabitRow
          key={habit.name}
          habit={habit}
          isFirst={i === 0}
          isLast={i === DEFAULT_HABITS.length - 1}
        />
      ))}
      <AddHabitRow />
    </AppScreen>
  );
}
