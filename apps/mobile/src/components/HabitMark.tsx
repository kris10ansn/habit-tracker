import { Pressable, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import type { MarkKind, MarkView } from '@/domain/marks';
import { cn } from '@/lib/cn';

type Size = 'lg' | 'sm';

interface Props {
  view: MarkView;
  size?: Size;
  // When set, the mark becomes a tap target that cycles the day's X/O state.
  onPress?: () => void;
}

// Container + glyph colors per state. `lg` (Today) is a bordered tile; `sm`
// (month grid) is a compact filled chip.
const CONTAINER: Record<MarkKind, string> = {
  done: 'bg-done-soft border-done',
  missed: 'bg-slip-soft border-slip',
  slip: 'bg-slip-soft border-slip',
  clean: 'bg-surface border-done',
  empty: 'bg-surface-2 border-line',
};

const GLYPH: Record<MarkKind, string> = {
  done: 'text-done',
  missed: 'text-slip',
  slip: 'text-slip',
  clean: 'text-done',
  empty: 'text-ink-3',
};

// Material icon per state — reads the shared X/O semantics via `kind`.
const ICON: Record<MarkKind, IconName> = {
  done: 'check',
  missed: 'close',
  slip: 'close',
  clean: 'check',
  empty: 'remove',
};

// `sm` drops the border and softens the neutral states so the grid reads as
// marks-on-paper rather than a wall of boxes.
const SM_CONTAINER: Record<MarkKind, string> = {
  done: 'bg-done-soft',
  missed: 'bg-slip-soft',
  slip: 'bg-slip-soft',
  clean: 'bg-transparent',
  empty: 'bg-transparent',
};

export function HabitMark({ view, size = 'lg', onPress }: Props) {
  const small = size === 'sm';
  const containerClassName = cn(
    'items-center justify-center',
    small ? 'h-7 w-7 rounded-lg' : 'h-[52px] w-[52px] rounded-2xl border-2',
    small ? SM_CONTAINER[view.kind] : CONTAINER[view.kind],
    !small && view.muted && 'opacity-40',
    onPress && 'active:opacity-60',
  );
  const glyph = (
    <Icon
      name={ICON[view.kind]}
      size={small ? 18 : view.kind === 'empty' ? 22 : 28}
      className={cn(GLYPH[view.kind], small && view.muted && 'opacity-40')}
    />
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={view.label}
        className={containerClassName}
      >
        {glyph}
      </Pressable>
    );
  }

  return <View className={containerClassName}>{glyph}</View>;
}
