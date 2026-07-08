const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
const MS_PER_DAY = 86_400_000;

// month is 0-based, matching JS Date — same key format as the reMarkable client and the backend.
export const dateKey = (year: number, month: number, day: number): string =>
    `${year}-${pad2(month + 1)}-${pad2(day)}`;

// The partition key for a month's entries, e.g. "2026-07". month is 0-based.
export const monthKey = (year: number, month: number): string =>
    `${year}-${pad2(month + 1)}`;

// The calendar day an instant falls on, as a date key (local calendar, so an instant created "now"
// keys to today). createdAt/updatedAt are epoch-ms instants while streak math is in date keys, so
// this is the bridge between them — see db/repo.getStreaks.
export const dateKeyOf = (instant: Date): string =>
    dateKey(instant.getFullYear(), instant.getMonth(), instant.getDate());

export const todayKey = (now: Date = new Date()): string => dateKeyOf(now);

// A calendar date is timezone-agnostic, so key arithmetic is done in UTC to sidestep DST shifts.
export const shiftDay = (key: string, deltaDays: number): string => {
    const shifted = new Date(
        Date.parse(`${key}T00:00:00Z`) + deltaDays * MS_PER_DAY,
    );
    return dateKey(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth(),
        shifted.getUTCDate(),
    );
};

// Whole days from `fromKey` to `toKey` (`toKey - fromKey`); negative if `toKey` is earlier.
export const daysBetween = (fromKey: string, toKey: string): number =>
    Math.round(
        (Date.parse(`${toKey}T00:00:00Z`) -
            Date.parse(`${fromKey}T00:00:00Z`)) /
            MS_PER_DAY,
    );

// The earlier / later of two date keys. Plain string comparison is safe because keys are
// fixed-width YYYY-MM-DD (see dateKey), so lexicographic order matches chronological order.
export const earlierKey = (a: string, b: string): string => (a < b ? a : b);
export const laterKey = (a: string, b: string): string => (a > b ? a : b);

// The [start, endExclusive) date-key range covering a month partition, for range queries.
export const monthKeyBounds = (
    key: string,
): { start: string; endExclusive: string } => {
    const [year, month] = key.split("-").map(Number);
    const next = addMonth(year, month - 1, 1);
    return {
        start: `${key}-01`,
        endExclusive: `${monthKey(next.year, next.month)}-01`,
    };
};

// A month partition plus the presentation metadata the grid needs. Month-independent of "today".
export interface MonthView {
    year: number;
    month: number; // 0-based
    daysInMonth: number;
    monthKey: string;
    monthLabel: string;
}

export const monthView = (year: number, month: number): MonthView => ({
    year,
    month,
    daysInMonth: new Date(year, month + 1, 0).getDate(),
    monthKey: monthKey(year, month),
    monthLabel: new Date(year, month, 1).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
    }),
});

export const currentMonthView = (now: Date = new Date()): MonthView =>
    monthView(now.getFullYear(), now.getMonth());

// Step `delta` whole months from (year, month), normalising the year rollover. month is 0-based.
export const addMonth = (
    year: number,
    month: number,
    delta: number,
): { year: number; month: number } => {
    const stepped = new Date(year, month + delta, 1);
    return { year: stepped.getFullYear(), month: stepped.getMonth() };
};

export const weekdayLabel = (now: Date = new Date()): string =>
    now.toLocaleDateString(undefined, { weekday: "long" });

export const monthDayLabel = (now: Date = new Date()): string =>
    now.toLocaleDateString(undefined, { month: "long", day: "numeric" });

export const weekdayShort = (
    year: number,
    month: number,
    day: number,
): string =>
    new Date(year, month, day).toLocaleDateString(undefined, {
        weekday: "short",
    });
