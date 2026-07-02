import { Text, View } from 'react-native';

import { HabitMark } from '@/components/HabitMark';
import { Card } from '@/components/ui/Card';
import { dateKey, weekdayNarrow, type MonthGrid as MonthGridMeta } from '@/domain/dates';
import { markView } from '@/domain/marks';
import type { Habit } from '@/domain/types';
import { cn } from '@/lib/cn';

interface Props {
  habits: Habit[];
  grid: MonthGridMeta;
  onToggle?: (habitIndex: number, dateKey: string) => void;
}

// Column header abbreviation — habits are columns in this portrait transpose, so
// full names don't fit. Initials of multi-word names, otherwise the first chars.
const columnLabel = (habit: Habit): string => {
  const words = habit.name.split(' ').filter(Boolean);
  const base = words.length > 1 ? words.map((w) => w[0]).join('') : habit.name.slice(0, 3);
  return habit.negative ? `${base}⁻` : base;
};

// Days as rows, habits as columns (portrait transpose of the reMarkable grid).
export function MonthGrid({ habits, grid, onToggle }: Props) {
  const days = Array.from({ length: grid.daysInMonth }, (_, i) => i + 1);

  return (
    <Card className="px-2 py-2">
      <View className="flex-row border-b border-line pb-2">
        <View className="w-11" />
        {habits.map((habit) => (
          <View key={habit.name} className="flex-1 items-center px-0.5">
            <Text numberOfLines={1} className="text-[10px] font-semibold text-ink-2">
              {columnLabel(habit)}
            </Text>
          </View>
        ))}
      </View>

      {days.map((day) => {
        const isToday = day === grid.today;
        const isFuture = day > grid.today;
        return (
          <View
            key={day}
            className={cn('flex-row items-center', isToday && 'rounded-lg bg-accent-soft')}
          >
            <View className="w-11 items-center py-1">
              <Text className={cn('text-xs', isToday ? 'font-bold text-accent' : 'text-ink-2')}>
                {day}
              </Text>
              <Text className="text-[9px] text-ink-3">
                {weekdayNarrow(grid.year, grid.month, day)}
              </Text>
            </View>
            {habits.map((habit, habitIndex) => {
              const dayKey = dateKey(grid.year, grid.month, day);
              return (
                <View key={habit.name} className="flex-1 items-center py-1">
                  <HabitMark
                    view={markView(habit, dayKey, isFuture)}
                    size="sm"
                    onPress={onToggle ? () => onToggle(habitIndex, dayKey) : undefined}
                  />
                </View>
              );
            })}
          </View>
        );
      })}
    </Card>
  );
}
