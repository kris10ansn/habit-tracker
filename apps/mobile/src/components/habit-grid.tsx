import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { dateKey, type MonthGrid } from '@/domain/dates';
import type { Habit } from '@/domain/types';

interface Mark {
  text: string;
  muted: boolean;
}

// X/O semantics from the shared glossary. Positive: x = done, o = not done, blank = unmarked.
// Negative: an unmarked day shows X ("stayed clean"); o = slipped. Future unmarked days on a
// negative habit are muted because "didn't slip" hasn't happened yet.
const markFor = (habit: Habit, key: string, day: number, today: number): Mark => {
  const entry = habit.entries[key];

  if (habit.negative) {
    if (entry === 'o') return { text: 'O', muted: false };
    return { text: 'X', muted: day > today };
  }

  if (entry === 'x') return { text: 'X', muted: false };
  if (entry === 'o') return { text: 'O', muted: false };
  return { text: '', muted: false };
};

interface Props {
  habits: Habit[];
  grid: MonthGrid;
}

export function HabitGrid({ habits, grid }: Props) {
  const days = Array.from({ length: grid.daysInMonth }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <View style={[styles.row, styles.headerRow]}>
        <View style={[styles.dayCell, styles.headerCell]} />
        {habits.map((habit) => (
          <View key={habit.name} style={[styles.cell, styles.headerCell]}>
            <Text numberOfLines={1} style={styles.headerText}>
              {habit.negative ? `${habit.name} (−)` : habit.name}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {days.map((day) => {
          const isToday = day === grid.today;
          return (
            <View key={day} style={[styles.row, isToday && styles.todayRow]}>
              <View style={styles.dayCell}>
                <Text style={[styles.dayText, isToday && styles.todayText]}>{day}</Text>
              </View>
              {habits.map((habit) => {
                const mark = markFor(habit, dateKey(grid.year, grid.month, day), day, grid.today);
                return (
                  <View key={habit.name} style={styles.cell}>
                    <Text style={[styles.markText, mark.muted && styles.mutedText]}>
                      {mark.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const HAIRLINE = StyleSheet.hairlineWidth;
const DAY_COL_WIDTH = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: HAIRLINE,
    borderBottomColor: '#ccc',
  },
  headerRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  todayRow: {
    backgroundColor: '#eee',
  },
  dayCell: {
    width: DAY_COL_WIDTH,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: HAIRLINE,
    borderRightColor: '#ccc',
  },
  cell: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: HAIRLINE,
    borderRightColor: '#eee',
  },
  headerCell: {
    paddingHorizontal: 4,
    justifyContent: 'flex-end',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
  },
  dayText: {
    fontSize: 14,
    color: '#000',
  },
  todayText: {
    fontWeight: '700',
  },
  markText: {
    fontSize: 16,
    color: '#000',
  },
  mutedText: {
    color: '#bbb',
  },
});
