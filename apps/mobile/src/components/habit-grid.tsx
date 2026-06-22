import { ScrollView, Text, View } from 'react-native';

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
    <View className="flex-1">
      <View className="flex-row items-stretch border-b border-black">
        <View className="w-11 items-center justify-end border-r border-neutral-300 px-1 py-2" />
        {habits.map((habit) => (
          <View
            key={habit.name}
            className="flex-1 items-center justify-end border-r border-neutral-200 px-1 py-2"
          >
            <Text numberOfLines={1} className="text-[11px] font-semibold text-black">
              {habit.negative ? `${habit.name} (−)` : habit.name}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerClassName="pb-6">
        {days.map((day) => {
          const isToday = day === grid.today;
          return (
            <View
              key={day}
              className={`flex-row items-stretch border-b border-neutral-300 ${
                isToday ? 'bg-neutral-200' : ''
              }`}
            >
              <View className="w-11 items-center justify-center border-r border-neutral-300 py-2">
                <Text className={`text-sm text-black ${isToday ? 'font-bold' : ''}`}>{day}</Text>
              </View>
              {habits.map((habit) => {
                const mark = markFor(habit, dateKey(grid.year, grid.month, day), day, grid.today);
                return (
                  <View
                    key={habit.name}
                    className="flex-1 items-center justify-center border-r border-neutral-200 py-2"
                  >
                    <Text className={`text-base ${mark.muted ? 'text-neutral-400' : 'text-black'}`}>
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
