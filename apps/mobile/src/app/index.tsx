import { AppScreen } from '@/components/ui/AppScreen';
import { DaySummary } from '@/components/today/DaySummary';
import { HabitListItem } from '@/components/today/HabitListItem';
import { monthGrid, todayKey, weekdayLabel, monthDayLabel } from '@/domain/dates';
import { isSuccess } from '@/domain/marks';
import { useHabits } from '@/state/HabitsProvider';

// Today: the primary daily surface — log each habit at a glance.
export default function TodayScreen() {
  const grid = monthGrid();
  const key = todayKey(grid);
  const { habits, toggleEntry } = useHabits();

  const logged = habits.filter((habit) => isSuccess(habit, key)).length;
  const slips = habits.filter((habit) => habit.negative && habit.entries[key] === 'o').length;

  return (
    <AppScreen
      eyebrow={`${weekdayLabel(grid)} · Today`}
      title={monthDayLabel(grid)}
      subtitle={`${logged} of ${habits.length} habits logged`}
    >
      <DaySummary logged={logged} total={habits.length} slips={slips} />
      {habits.map((habit, index) => (
        <HabitListItem
          key={habit.name}
          habit={habit}
          dateKey={key}
          grid={grid}
          onToggle={() => toggleEntry(index, key)}
        />
      ))}
    </AppScreen>
  );
}
