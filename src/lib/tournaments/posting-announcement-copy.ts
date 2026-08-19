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

import { formatTeamGender, formatTeamRegion } from "@/lib/labels/team";
import type { TeamGender, TeamRegion } from "@/types";

export const POSTING_ANNOUNCEMENT_SUBJECT_MAX = 200;
export const POSTING_ANNOUNCEMENT_BODY_MAX = 4000;
export const POSTING_ANNOUNCEMENT_WEEKLY_LIMIT = 2;

export function uniqueRegions(regions: TeamRegion[]): TeamRegion[] {
  return [...new Set(regions)];
}

export function defaultPostingAnnouncement(input: {
  tournamentName: string;
  dateDisplay: string;
  location: string;
  gender: TeamGender;
  regions: TeamRegion[];
}): { subject: string; body: string } {
  const regionLabel = uniqueRegions(input.regions)
    .map((region) => formatTeamRegion(region))
    .join(", ");
  return {
    subject: `New ${formatTeamGender(input.gender)} tournament: ${input.tournamentName}`,
    body: `Hi {{captainName}},

${input.tournamentName} is now posted for ${formatTeamGender(input.gender)} teams in ${regionLabel}.

Date: ${input.dateDisplay}
Location: ${input.location}

If this fits your team's schedule, you can review details and register in brackt.

Thanks,
Tournament host`,
  };
}
