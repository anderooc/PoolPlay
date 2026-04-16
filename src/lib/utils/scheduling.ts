export interface ScheduleSlot {
  matchId: string;
  courtId: string;
  scheduledTime: Date;
}

/**
 * Auto-schedules matches across courts and time slots.
 * Each match gets a ~30-minute slot by default.
 */
export function autoScheduleMatches(
  matchIds: string[],
  courtIds: string[],
  startTime: Date,
  matchDurationMinutes: number = 30
): ScheduleSlot[] {
  if (courtIds.length === 0 || matchIds.length === 0) return [];

  const slots: ScheduleSlot[] = [];
  let currentTime = new Date(startTime);
  let courtIndex = 0;

  for (const matchId of matchIds) {
    slots.push({
      matchId,
      courtId: courtIds[courtIndex],
      scheduledTime: new Date(currentTime),
    });

    courtIndex++;
    if (courtIndex >= courtIds.length) {
      courtIndex = 0;
      currentTime = new Date(
        currentTime.getTime() + matchDurationMinutes * 60 * 1000
      );
    }
  }

  return slots;
}
