import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/cn';

interface Props {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Button({ label, onPress, disabled, className }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        'items-center rounded-field bg-accent py-4 active:opacity-80',
        disabled && 'opacity-50',
        className,
      )}
    >
      <Text className="text-[15px] font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
