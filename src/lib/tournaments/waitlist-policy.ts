/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

export interface RegistrationCapacityInput {
  teamIds: readonly string[];
  capacity: number | null;
  activeRegistrationCount: number;
}

export interface RegistrationCapacityAllocation {
  acceptedTeamIds: string[];
  waitlistedTeamIds: string[];
}

function assertActiveRegistrationCount(activeCount: number): void {
  if (activeCount < 0) {
    throw new RangeError("Active registration count cannot be negative.");
  }
}

export function allocateRegistrationCapacity({
  teamIds,
  capacity,
  activeRegistrationCount,
}: RegistrationCapacityInput): RegistrationCapacityAllocation {
  assertActiveRegistrationCount(activeRegistrationCount);
  const acceptedCount =
    capacity === null
      ? teamIds.length
      : Math.max(0, capacity - activeRegistrationCount);

  return {
    acceptedTeamIds: teamIds.slice(0, acceptedCount),
    waitlistedTeamIds: teamIds.slice(acceptedCount),
  };
}

export function registrationDeadlinePassed(
  deadline: Date | null,
  databaseNow: Date
): boolean {
  return deadline !== null && databaseNow.getTime() >= deadline.getTime();
}

export function capacityAvailable(
  capacity: number | null,
  activeCount: number
): boolean {
  assertActiveRegistrationCount(activeCount);
  return capacity === null || activeCount < capacity;
}
