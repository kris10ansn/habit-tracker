import { Text, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';

interface Props {
  label: string;
  onPrev?: () => void;
  onNext?: () => void;
}

export function MonthNav({ label, onPrev, onNext }: Props) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <IconButton glyph="‹" onPress={onPrev} />
      <Text className="text-[17px] font-semibold text-ink">{label}</Text>
      <IconButton glyph="›" onPress={onNext} />
    </View>
  );
}
