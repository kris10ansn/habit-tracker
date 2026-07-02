import { Text, View, ViewStyle } from 'react-native';

import { cn } from '@/lib/cn';

type PillProps = {
  className?: string;
  style?: ViewStyle;
  label: string;
  labelClassName?: string;
};

export function Pill({ className, ...props }: PillProps) {
  return (
    <View
      className={cn(
        'self-start rounded-full bg-accent-soft px-2 py-0.5',
        'children' in props && 'flex-row',
        className,
      )}
      style={props.style}
    >
      <Text className={cn('text-sm font-semibold text-accent', props.labelClassName)}>
        {props.label}
      </Text>
    </View>
  );
}
