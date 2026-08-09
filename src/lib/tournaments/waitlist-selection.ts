/*
 * ShootSet - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

export type EligibleWaitlistEntry = {
  id: string;
  queuePosition: number;
  eligible: boolean;
};

export function selectOldestEligibleWaitlistEntry<
  T extends EligibleWaitlistEntry,
>(entries: T[]): T | undefined {
  return entries
    .filter((entry) => entry.eligible)
    .reduce<T | undefined>(
      (oldest, entry) =>
        !oldest || entry.queuePosition < oldest.queuePosition ? entry : oldest,
      undefined
    );
}
