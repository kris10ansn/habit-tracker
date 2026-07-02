import { Text, View } from 'react-native';

import { HabitMark } from '@/components/HabitMark';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import type { MonthGrid } from '@/domain/dates';
import { currentStreak, isSuccess, markView, priorStreak } from '@/domain/marks';
import type { Habit } from '@/domain/types';

interface Props {
  habit: Habit;
  dateKey: string;
  grid: MonthGrid;
  onToggle?: () => void;
}

// One habit on the Today screen: name, streak/polarity, and today's mark.
export function HabitListItem({ habit, dateKey, grid, onToggle }: Props) {
  const view = markView(habit, dateKey);

  const success = isSuccess(habit, dateKey);
  const existingStreak = priorStreak(habit, grid);
  const streak = currentStreak(habit, grid);

  return (
    <Card className="mb-3 flex-row items-center gap-3.5">
      <View className="flex-1">
        <Text numberOfLines={1} className="text-base font-semibold text-ink">
          {habit.name}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          {habit.negative && <Pill label="avoid" />}

          {(streak || existingStreak) && !['slip', 'missed'].includes(view.kind) ? (
            <Pill
              className={'bg-orange-200'}
              labelClassName="text-orange-900"
              label={`🔥 ${Math.max(existingStreak, streak)} days `}
              style={!success ? { filter: 'grayscale(100%)' } : undefined}
            />
          ) : (
            <Text>Tap to {success ? 'unmark' : 'mark'}</Text>
          )}
        </View>
      </View>
      <HabitMark view={view} size="lg" onPress={onToggle} />
    </Card>
  );
}
