/**
 * Shared helpers for tournament status display. "Archived" is a pure
 * date-based derived state: a tournament whose date is strictly before
 * today is treated as archived everywhere in the UI, regardless of its
 * underlying status enum value. Editing the date back to today/future
 * automatically un-archives it on the next render.
 */

/**
 * Today as YYYY-MM-DD in the user's local timezone. Matches date inputs
 * and `tournaments.date` (calendar dates, not UTC midnight).
 */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Archived only when the tournament date is strictly before today. */
export function isTournamentArchived(
  tournamentDate: string,
  today: string = todayISO()
): boolean {
  return tournamentDate < today;
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
  tournamentDate: string,
  today: string = todayISO()
): string {
  if (isTournamentArchived(tournamentDate, today)) return "Archived";
  return STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}
