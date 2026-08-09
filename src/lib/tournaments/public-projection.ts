/*
 * ShootSet - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

export { buildPublicTournamentListProjection } from "./public-list-projection";

export interface PublicRegistrationAvailability {
  capacity: number | null;
  deadline: string | null;
  registeredCount: number;
  waitlistCount: number;
}
