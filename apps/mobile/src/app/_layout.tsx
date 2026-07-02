import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';

import '../../global.css';

// Text-glyph tab icons — this app has no icon font installed. Tint follows the
// focused state via NativeWind rather than the navigator's color prop.
function TabGlyph({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text className={cn('text-xl', focused ? 'text-accent' : 'text-ink-3')}>{glyph}</Text>;
}

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.ink3,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="◎" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="month"
        options={{
          title: 'Month',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="▦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Habits',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="✎" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Sync',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="⟳" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
