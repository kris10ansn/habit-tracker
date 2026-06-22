import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { HabitGrid } from '@/components/habit-grid';
import { monthGrid } from '@/domain/dates';
import { DEFAULT_HABITS } from '@/domain/habits';

// SafeAreaView is a third-party component, so NativeWind needs to be told to map
// `className` onto its `style` prop.
cssInterop(SafeAreaView, { className: 'style' });

export default function GridScreen() {
  const grid = monthGrid();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="px-3 py-3">
        <Text className="text-[22px] font-bold text-black">{grid.monthLabel}</Text>
        <Text className="mt-0.5 text-[13px] text-[#444]">
          {grid.daysInMonth} days · today is the {grid.today}.
        </Text>
      </View>
      <HabitGrid habits={DEFAULT_HABITS} grid={grid} />
    </SafeAreaView>
  );
}
