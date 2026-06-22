const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

// month is 0-based, matching JS Date — same key format as the reMarkable client.
export const dateKey = (year: number, month: number, day: number): string =>
  `${year}-${pad2(month + 1)}-${pad2(day)}`;

export interface MonthGrid {
  year: number;
  month: number; // 0-based
  daysInMonth: number;
  today: number; // day-of-month
  monthLabel: string;
}

export const monthGrid = (date: Date = new Date()): MonthGrid => {
  const year = date.getFullYear();
  const month = date.getMonth();

  return {
    year,
    month,
    daysInMonth: new Date(year, month + 1, 0).getDate(),
    today: date.getDate(),
    monthLabel: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  };
};
