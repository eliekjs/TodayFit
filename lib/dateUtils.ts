/**
 * Calendar date in the user's local timezone (YYYY-MM-DD).
 * Use this instead of toISOString().slice(0, 10) so "today" and week days
 * match the device's actual day, not UTC.
 */
export function getLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today's date in local timezone (for comparing with plan day dates). */
export function getTodayLocalDateString(): string {
  return getLocalDateString(new Date());
}

/** Monday (YYYY-MM-DD) of the week containing the given date, in local timezone. */
export function getWeekStartMonday(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return getLocalDateString(d);
}

/** Monday (YYYY-MM-DD) of the current week in local timezone. */
export function getCurrentWeekStartMonday(): string {
  return getWeekStartMonday(getTodayLocalDateString());
}

/** Parse YYYY-MM-DD as a local date (noon avoids UTC midnight day-boundary issues). */
export function parseLocalDate(isoDate: string): Date {
  return new Date(isoDate + "T12:00:00");
}
