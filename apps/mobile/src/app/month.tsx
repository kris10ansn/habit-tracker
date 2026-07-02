import { AppScreen } from '@/components/ui/app-screen';
import { MonthGrid } from '@/components/month/month-grid';
import { MonthNav } from '@/components/month/month-nav';
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
