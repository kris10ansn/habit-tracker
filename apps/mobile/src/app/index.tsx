import { AppScreen } from '@/components/ui/app-screen';
import { DaySummary } from '@/components/today/day-summary';
import { HabitListItem } from '@/components/today/habit-list-item';
import { monthGrid, todayKey, weekdayLabel, monthDayLabel } from '@/domain/dates';
import { DEFAULT_HABITS } from '@/domain/habits';
import { isSuccess } from '@/domain/marks';

// Today: the primary daily surface — log each habit at a glance.
export default function TodayScreen() {
  const grid = monthGrid();
  const key = todayKey(grid);

  const logged = DEFAULT_HABITS.filter((habit) => isSuccess(habit, key)).length;
  const slips = DEFAULT_HABITS.filter(
    (habit) => habit.negative && habit.entries[key] === 'o',
  ).length;

  return (
    <AppScreen
      eyebrow={`${weekdayLabel(grid)} · Today`}
      title={monthDayLabel(grid)}
      subtitle={`${logged} of ${DEFAULT_HABITS.length} habits logged`}
    >
      <DaySummary logged={logged} total={DEFAULT_HABITS.length} slips={slips} />
      {DEFAULT_HABITS.map((habit) => (
        <HabitListItem key={habit.name} habit={habit} dateKey={key} grid={grid} />
      ))}
    </AppScreen>
  );
}
