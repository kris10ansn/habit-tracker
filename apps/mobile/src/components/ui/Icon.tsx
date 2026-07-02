import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';

// MaterialIcons is third-party, so NativeWind needs to map `className` onto its
// `style` prop — the icon renders a `Text` whose `style.color` wins over its
// default `color`, so Tailwind `text-*` utilities tint it. Registered once here.
cssInterop(MaterialIcons, { className: 'style' });

// The shared icon primitive: MaterialIcons with className-driven color. Pass
// `size` as a number (icons aren't sized by text utilities) and a `text-*`
// class for the tint. Names are constrained to the Material set.
export type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Props {
  name: IconName;
  size?: number;
  className?: string;
  // Escape hatch for callers that hand us a resolved color rather than a class
  // — chiefly the React Navigation tab bar, which computes the active tint.
  color?: ColorValue;
}

export function Icon({ name, size = 20, className, color }: Props) {
  return <MaterialIcons name={name} size={size} className={className} color={color} />;
}
