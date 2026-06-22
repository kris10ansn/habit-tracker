import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HabitGrid } from '@/components/habit-grid';
import { monthGrid } from '@/domain/dates';
import { DEFAULT_HABITS } from '@/domain/habits';

export default function GridScreen() {
  const grid = monthGrid();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>{grid.monthLabel}</Text>
        <Text style={styles.subtitle}>
          {grid.daysInMonth} days · today is the {grid.today}.
        </Text>
      </View>
      <HabitGrid habits={DEFAULT_HABITS} grid={grid} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 13,
    color: '#444',
    marginTop: 2,
  },
});
