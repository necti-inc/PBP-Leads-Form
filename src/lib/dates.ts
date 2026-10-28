/** Service visit days: Monday=1, Tuesday=2, Wednesday=3 */
export const SERVICE_WEEKDAYS = new Set([1, 2, 3]);

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function atNoon(date: Date): Date {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next;
}

export function startOfMonth(date: Date): Date {
  return atNoon(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function addMonths(date: Date, amount: number): Date {
  return atNoon(new Date(date.getFullYear(), date.getMonth() + amount, 1));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isServiceWeekday(date: Date): boolean {
  return SERVICE_WEEKDAYS.has(date.getDay());
}

/** Earliest bookable day = tomorrow at noon. */
export function getBookingStartDate(now = new Date()): Date {
  const start = atNoon(now);
  start.setDate(start.getDate() + 1);
  return start;
}

/** How far ahead customers can book (inclusive month window). */
export function getBookingEndDate(now = new Date()): Date {
  const end = getBookingStartDate(now);
  end.setDate(end.getDate() + 60);
  return end;
}

/**
 * True when this date can be selected today.
 * Ready for Google Calendar: pass `blockedDates` (ISO yyyy-mm-dd) later.
 */
export function isDateSelectable(
  date: Date,
  blockedDates: Set<string> = new Set()
): boolean {
  if (!isServiceWeekday(date)) return false;

  const start = getBookingStartDate();
  const end = getBookingEndDate();
  const day = atNoon(date);

  if (day < start || day > end) return false;
  if (blockedDates.has(toISODate(day))) return false;

  return true;
}

export type CalendarCell = {
  date: Date;
  iso: string;
  inMonth: boolean;
  selectable: boolean;
  isToday: boolean;
};

/** Build a Sunday-start month grid (6 weeks × 7 days). */
export function buildMonthCells(
  month: Date,
  blockedDates: Set<string> = new Set()
): CalendarCell[] {
  const first = startOfMonth(month);
  const today = atNoon(new Date());
  const startPad = first.getDay(); // 0=Sun
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startPad);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = atNoon(new Date(gridStart));
    date.setDate(gridStart.getDate() + i);
    cells.push({
      date,
      iso: toISODate(date),
      inMonth: date.getMonth() === first.getMonth(),
      selectable: isDateSelectable(date, blockedDates),
      isToday: isSameDay(date, today),
    });
  }
  return cells;
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatFriendlyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
