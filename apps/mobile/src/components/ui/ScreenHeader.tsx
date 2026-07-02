import { Text, View } from 'react-native';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

// The in-app page header (the native nav header is hidden). Shared by every tab
// so titles line up across screens.
export function ScreenHeader({ eyebrow, title, subtitle }: Props) {
  return (
    <View className="px-4 pb-3 pt-1">
      {eyebrow ? (
        <Text className="text-xs font-semibold uppercase tracking-wide text-accent">{eyebrow}</Text>
      ) : null}
      <Text className="mt-0.5 text-3xl font-bold tracking-tight text-ink">{title}</Text>
      {subtitle ? <Text className="mt-0.5 text-[13px] text-ink-2">{subtitle}</Text> : null}
    </View>
  );
}
