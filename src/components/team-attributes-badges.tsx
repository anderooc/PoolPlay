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

import { Badge } from "@/components/ui/badge";
import { formatTeamGender, formatTeamRegion } from "@/lib/labels/team";
import { cn } from "@/lib/utils";
import type { TeamGender, TeamRegion } from "@/types";

export function TeamAttributesBadges({
  gender,
  region,
  className,
}: {
  gender: TeamGender;
  region: TeamRegion;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full min-w-0 flex-wrap items-center gap-1.5",
        className
      )}
    >
      <Badge variant="secondary">{formatTeamGender(gender)}</Badge>
      <Badge variant="outline">{formatTeamRegion(region)}</Badge>
    </div>
  );
}
