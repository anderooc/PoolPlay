"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SCHOOL_VERIFICATION_STATUS_LABELS,
} from "@/lib/constants/school";
import {
  TEAM_GENDERS,
  TEAM_REGIONS,
  TEAM_GENDER_LABELS,
  TEAM_REGION_LABELS,
} from "@/lib/constants/team";
import { cn } from "@/lib/utils";
import type { SchoolVerificationStatus, TeamGender, TeamRegion } from "@/types";
import { SlidersHorizontal } from "lucide-react";
import { FilterToggle } from "@/components/filter-toggle";

const SCHOOL_VERIFICATION_STATUSES: SchoolVerificationStatus[] = [
  "pending",
  "verified",
  "rejected",
];

export function countActiveSchoolFilters({
  genderFilter,
  regionFilter,
  verificationFilter,
}: {
  genderFilter: ReadonlySet<TeamGender>;
  regionFilter: ReadonlySet<TeamRegion>;
  verificationFilter: ReadonlySet<SchoolVerificationStatus>;
}): number {
  return (
    genderFilter.size + regionFilter.size + verificationFilter.size
  );
}

export function SchoolListFilters({
  genderFilter,
  regionFilter,
  verificationFilter,
  onToggleGender,
  onToggleRegion,
  onToggleVerification,
  onClear,
}: {
  genderFilter: ReadonlySet<TeamGender>;
  regionFilter: ReadonlySet<TeamRegion>;
  verificationFilter: ReadonlySet<SchoolVerificationStatus>;
  onToggleGender: (value: TeamGender) => void;
  onToggleRegion: (value: TeamRegion) => void;
  onToggleVerification: (value: SchoolVerificationStatus) => void;
  onClear: () => void;
}) {
  const activeCount = countActiveSchoolFilters({
    genderFilter,
    regionFilter,
    verificationFilter,
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
                : "Filter schools"
            }
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <PopoverContent className="w-80 p-4" align="end">
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

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Verification
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {SCHOOL_VERIFICATION_STATUSES.map((value) => (
                <FilterToggle
                  key={value}
                  label={SCHOOL_VERIFICATION_STATUS_LABELS[value]}
                  pressed={verificationFilter.has(value)}
                  onClick={() => onToggleVerification(value)}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
