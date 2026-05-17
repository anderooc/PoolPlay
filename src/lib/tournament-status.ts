/**
 * Shared helpers for tournament status display. "Archived" is a pure
 * date-based derived state: a tournament whose end date is strictly before
 * today is treated as archived everywhere in the UI, regardless of its
 * underlying status enum value. Editing the date back to today/future
 * automatically un-archives it on the next render.
 */

/** Today as a YYYY-MM-DD string (UTC). Matches `tournaments.endDate`. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Tournament is archived when its end date is in the past. */
export function isTournamentArchived(
  endDate: string,
  today: string = todayISO()
): boolean {
  return endDate < today;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  registration_open: "Registration open",
  registration_closed: "Registration closed",
  in_progress: "In progress",
  completed: "Completed",
};

/**
 * Returns the label to show in a status badge. Archived overrides the
 * underlying status so users see one consistent label for old events.
 */
export function statusBadgeLabel(
  status: string,
  endDate: string,
  today: string = todayISO()
): string {
  if (isTournamentArchived(endDate, today)) return "Archived";
  return STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}
