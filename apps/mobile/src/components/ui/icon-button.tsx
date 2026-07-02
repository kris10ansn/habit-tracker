import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/cn';

type Size = 'md' | 'xs';

interface Props {
  glyph: string;
  onPress?: () => void;
  disabled?: boolean;
  size?: Size;
  className?: string;
}

// Square, glyph-labelled tap target — month arrows, list reordering, etc.
// Uses text glyphs rather than an icon font (none is installed in this app).
const SIZES: Record<Size, { box: string; text: string }> = {
  md: { box: 'h-9 w-9 rounded-field', text: 'text-lg' },
  xs: { box: 'h-5 w-6 rounded-md', text: 'text-[11px]' },
};

export function IconButton({ glyph, onPress, disabled, size = 'md', className }: Props) {
  const s = SIZES[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        'items-center justify-center bg-surface-2 active:opacity-70',
        size === 'md' && 'bg-surface shadow-sm',
        s.box,
        disabled && 'opacity-40',
        className,
      )}
    >
      <Text className={cn(s.text, 'text-ink-2')}>{glyph}</Text>
    </Pressable>
  );
}
