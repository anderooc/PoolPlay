"use client";

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

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TEAM_GENDERS,
  TEAM_REGIONS,
  TEAM_GENDER_LABELS,
  TEAM_REGION_LABELS,
} from "@/lib/constants/team";
import { cn } from "@/lib/utils";
import type { TeamGender, TeamRegion } from "@/types";
import { SlidersHorizontal } from "lucide-react";
import { FilterToggle } from "@/components/filter-toggle";

export function countActiveScheduleFilters({
  genderFilter,
  regionFilter,
}: {
  genderFilter: ReadonlySet<TeamGender>;
  regionFilter: ReadonlySet<TeamRegion>;
}): number {
  return genderFilter.size + regionFilter.size;
}

export function ScheduleListFilters({
  genderFilter,
  regionFilter,
  onToggleGender,
  onToggleRegion,
  onClear,
}: {
  genderFilter: ReadonlySet<TeamGender>;
  regionFilter: ReadonlySet<TeamRegion>;
  onToggleGender: (value: TeamGender) => void;
  onToggleRegion: (value: TeamRegion) => void;
  onClear: () => void;
}) {
  const activeCount = countActiveScheduleFilters({
    genderFilter,
    regionFilter,
  });
  const hasActiveFilters = activeCount > 0;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn("shrink-0", hasActiveFilters && "bg-muted")}
            aria-label={
              hasActiveFilters
                ? `Filters, ${activeCount} active`
                : "Filter schedule"
            }
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <PopoverContent
        className="w-[min(20rem,calc(100vw-2rem))] p-4"
        align="end"
      >
        <div className="space-y-3">
          <div className="flex h-7 items-center justify-between gap-2">
            <p className="text-sm font-medium">Filters</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 shrink-0 px-2 text-xs",
                !hasActiveFilters && "invisible pointer-events-none"
              )}
              onClick={onClear}
              tabIndex={hasActiveFilters ? 0 : -1}
              aria-hidden={!hasActiveFilters}
            >
              Clear all
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Gender</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEAM_GENDERS.map((value) => (
                <FilterToggle
                  key={value}
                  label={TEAM_GENDER_LABELS[value]}
                  pressed={genderFilter.has(value)}
                  onClick={() => onToggleGender(value)}
                  tone={value === "mens" ? "primary" : "secondary"}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Region</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEAM_REGIONS.map((value) => (
                <FilterToggle
                  key={value}
                  label={TEAM_REGION_LABELS[value]}
                  pressed={regionFilter.has(value)}
                  onClick={() => onToggleRegion(value)}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
