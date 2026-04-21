export interface ScheduleSlot {
  matchId: string;
  courtId: string;
  scheduledTime: Date;
}

/**
 * Auto-schedules matches across courts and time slots.
 * Each match supplies its own allowed court ids (e.g. division-scoped + shared).
 * Time advances in rounds of width max(court list length) to keep parallelism sensible.
 */
export function autoScheduleMatchesWithCourtSets(
  items: { matchId: string; courtIds: string[] }[],
  startTime: Date,
  matchDurationMinutes: number = 30
): ScheduleSlot[] {
  const valid = items.filter((i) => i.courtIds.length > 0);
  if (valid.length === 0) return [];

  const maxCourts = Math.max(...valid.map((i) => i.courtIds.length), 1);
  const slots: ScheduleSlot[] = [];

  for (let i = 0; i < valid.length; i++) {
    const item = valid[i];
    const pool = item.courtIds;
    const courtId = pool[i % pool.length];
    const timeIdx = Math.floor(i / maxCourts);
    const scheduledTime = new Date(
      startTime.getTime() + timeIdx * matchDurationMinutes * 60 * 1000
    );
    slots.push({ matchId: item.matchId, courtId, scheduledTime });
  }

  return slots;
}

/**
 * Auto-schedules matches when every match may use the same court list.
 */
export function autoScheduleMatches(
  matchIds: string[],
  courtIds: string[],
  startTime: Date,
  matchDurationMinutes: number = 30
): ScheduleSlot[] {
  if (courtIds.length === 0 || matchIds.length === 0) return [];
  return autoScheduleMatchesWithCourtSets(
    matchIds.map((matchId) => ({ matchId, courtIds })),
    startTime,
    matchDurationMinutes
  );
}
