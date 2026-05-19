import { todayISO } from "@/lib/tournament-status";

/** Years after the current calendar year included in date-picker year dropdowns. */
export const CALENDAR_YEARS_AHEAD = 2;

/** Parses a YYYY-MM-DD string into a local Date. Avoids UTC drift. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Formats a local Date as YYYY-MM-DD (matches `tournaments.date`). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Bounds for month/year dropdowns: current year through a few years ahead. */
export function getCalendarMonthBounds(isoDates: string[] = []) {
  const today = todayISO();
  const todayDate = parseISODate(today);
  const currentYear = todayDate.getFullYear();
  let endYear = currentYear + CALENDAR_YEARS_AHEAD;

  for (const iso of isoDates) {
    const year = parseISODate(iso).getFullYear();
    if (year > endYear) endYear = year;
  }

  return {
    startMonth: new Date(currentYear, 0, 1),
    endMonth: new Date(endYear, 11, 1),
    today,
  };
}

export function formatISODateLabel(
  iso: string,
  options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  }
): string {
  return parseISODate(iso).toLocaleDateString(undefined, options);
}
