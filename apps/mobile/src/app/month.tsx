import { AppScreen } from '@/components/ui/AppScreen';
import { MonthGrid } from '@/components/month/MonthGrid';
import { MonthNav } from '@/components/month/MonthNav';
import { monthGrid } from '@/domain/dates';
import { DEFAULT_HABITS } from '@/domain/habits';

// Month: the whole grid at review scale — days down, habits across.
export default function MonthScreen() {
  const grid = monthGrid();

  return (
    <AppScreen eyebrow="Overview" title="Month" subtitle="Your habits across the month">
      <MonthNav label={grid.monthLabel} />
      <MonthGrid habits={DEFAULT_HABITS} grid={grid} />
    </AppScreen>
  );
}
