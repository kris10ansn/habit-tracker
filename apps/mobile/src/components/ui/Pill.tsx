import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';

interface Props {
  label: string;
  className?: string;
}

export function Pill({ label, className }: Props) {
  return (
    <View className={cn('self-start rounded-full bg-accent-soft px-2 py-0.5', className)}>
      <Text className="text-[11px] font-semibold text-accent">{label}</Text>
    </View>
  );
}
