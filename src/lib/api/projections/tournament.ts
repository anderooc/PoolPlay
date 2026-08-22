/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { PublicTournamentListItem } from "@/lib/tournaments/public-list-projection";
import type {
  TournamentDetailContract,
  TournamentDivisionContract,
  TournamentListItemContract,
} from "../contracts/tournament";

/**
 * Restates each field so the wire format is pinned to the contract rather than
 * to whatever the loader happens to select. Adding a column to the internal
 * projection does not leak it to clients; removing one breaks this build.
 */
export function buildTournamentListItemContract(
  item: PublicTournamentListItem
): TournamentListItemContract {
  return {
    slug: item.slug,
    name: item.name,
    description: item.description,
    location: item.location,
    date: item.date,
    status: item.status,
    gender: item.gender,
    region: item.region,
    registrationAvailability: {
      capacity: item.registrationAvailability.capacity,
      deadline: item.registrationAvailability.deadline,
      registeredCount: item.registrationAvailability.registeredCount,
      waitlistCount: item.registrationAvailability.waitlistCount,
    },
    hostSchool: item.hostSchool
      ? {
          name: item.hostSchool.name,
          slug: item.hostSchool.slug,
          verificationStatus: item.hostSchool.verificationStatus,
        }
      : null,
  };
}

export function buildTournamentDetailContract(
  item: PublicTournamentListItem,
  extras: {
    address: string | null;
    organizerName: string;
    registrationOpen: boolean;
    divisions: TournamentDivisionContract[];
  }
): TournamentDetailContract {
  return {
    ...buildTournamentListItemContract(item),
    address: extras.address,
    organizerName: extras.organizerName,
    registrationOpen: extras.registrationOpen,
    divisions: extras.divisions,
  };
}
