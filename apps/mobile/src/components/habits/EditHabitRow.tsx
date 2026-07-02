import { Pressable, Text, TextInput, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import type { Habit } from '@/domain/types';

import { PolarityToggle } from './PolarityToggle';

interface Props {
  habit: Habit;
  isFirst: boolean;
  isLast: boolean;
}

// Editable habit row: reorder, rename, set polarity, delete. Presentational —
// the controls are affordances only until state wiring lands.
export function EditHabitRow({ habit, isFirst, isLast }: Props) {
  return (
    <View className="mb-2.5 flex-row items-center gap-3 rounded-card bg-surface px-3.5 py-3 shadow-sm">
      <View className="gap-0.5">
        <IconButton glyph="▲" size="xs" disabled={isFirst} />
        <IconButton glyph="▼" size="xs" disabled={isLast} />
      </View>

      <View className="flex-1">
        <TextInput
          defaultValue={habit.name}
          className="py-0.5 text-[15px] font-semibold text-ink"
        />
        <View className="mt-1">
          <PolarityToggle negative={habit.negative} />
        </View>
      </View>

      <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-slip-soft active:opacity-70">
        <Text className="text-sm font-bold text-slip">✕</Text>
      </Pressable>
    </View>
  );
}
