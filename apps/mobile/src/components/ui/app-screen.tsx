import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { ScreenHeader } from './screen-header';

// SafeAreaView is third-party, so NativeWind needs to map `className` onto its
// `style` prop. Registered once here since AppScreen owns the safe area.
cssInterop(SafeAreaView, { className: 'style' });

interface Props {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  scroll?: boolean;
  children: ReactNode;
}

// Page scaffold shared by every tab: safe-area frame, header, and a body that
// either scrolls (default) or fills. The bottom edge is owned by the tab bar.
export function AppScreen({ title, eyebrow, subtitle, scroll = true, children }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-surface-2" edges={['top', 'left', 'right']}>
      <ScreenHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      {scroll ? (
        <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8">
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 px-4">{children}</View>
      )}
    </SafeAreaView>
  );
}
