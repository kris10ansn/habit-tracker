import { Text, View } from 'react-native';

import { HabitMark } from '@/components/HabitMark';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import type { MonthGrid } from '@/domain/dates';
import { currentStreak, markView, streakLabel } from '@/domain/marks';
import type { Habit } from '@/domain/types';

interface Props {
  habit: Habit;
  dateKey: string;
  grid: MonthGrid;
}

// One habit on the Today screen: name, streak/polarity, and today's mark.
export function HabitListItem({ habit, dateKey, grid }: Props) {
  const view = markView(habit, dateKey);
  const streak = currentStreak(habit, grid);

  return (
    <Card className="mb-3 flex-row items-center gap-3.5">
      <View className="flex-1">
        <Text numberOfLines={1} className="text-base font-semibold text-ink">
          {habit.name}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          {habit.negative ? <Pill label="avoid" /> : null}
          <Text className="text-[13px] text-ink-2">{streakLabel(habit, streak)}</Text>
        </View>
      </View>
      <HabitMark view={view} size="lg" />
    </Card>
  );
}
