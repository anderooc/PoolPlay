"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  TEAM_GENDERS,
  TEAM_REGIONS,
  TEAM_GENDER_LABELS,
  TEAM_REGION_LABELS,
} from "@/lib/constants/team";
import { cn } from "@/lib/utils";
import type { TeamGender, TeamRegion } from "@/types";
import { SlidersHorizontal } from "lucide-react";

const toggleClassName = (pressed: boolean) =>
  cn(
    "h-9 w-full min-w-0 border px-3 py-1.5 text-xs font-medium leading-snug whitespace-normal text-center",
    pressed
      ? "border-primary bg-primary/10 text-foreground shadow-none"
      : "bg-transparent text-muted-foreground"
  );

function FilterToggle({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={toggleClassName(pressed)}
      onClick={onClick}
      aria-pressed={pressed}
    >
      {label}
    </Button>
  );
}

function FilterSwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  );
}

export function countActiveTournamentFilters({
  genderFilter,
  regionFilter,
  hideArchived,
  registrationOpenOnly,
  defaultHideArchived = false,
}: {
  genderFilter: ReadonlySet<TeamGender>;
  regionFilter: ReadonlySet<TeamRegion>;
  hideArchived: boolean;
  registrationOpenOnly: boolean;
  defaultHideArchived?: boolean;
}): number {
  let count = genderFilter.size + regionFilter.size;
  if (registrationOpenOnly) count += 1;
  if (hideArchived !== defaultHideArchived) count += 1;
  return count;
}

export function TournamentListFilters({
  genderFilter,
  regionFilter,
  hideArchived,
  registrationOpenOnly,
  onToggleGender,
  onToggleRegion,
  onHideArchivedChange,
  onRegistrationOpenOnlyChange,
  onClear,
}: {
  genderFilter: ReadonlySet<TeamGender>;
  regionFilter: ReadonlySet<TeamRegion>;
  hideArchived: boolean;
  registrationOpenOnly: boolean;
  onToggleGender: (value: TeamGender) => void;
  onToggleRegion: (value: TeamRegion) => void;
  onHideArchivedChange: (value: boolean) => void;
  onRegistrationOpenOnlyChange: (value: boolean) => void;
  onClear: () => void;
}) {
  const activeCount = countActiveTournamentFilters({
    genderFilter,
    regionFilter,
    hideArchived,
    registrationOpenOnly,
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
                : "Filter tournaments"
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

          <div className="space-y-2.5 rounded-lg border bg-muted/20 p-3">
            <FilterSwitchRow
              label="Hide past events"
              description="Only show today and upcoming dates"
              checked={hideArchived}
              onCheckedChange={onHideArchivedChange}
            />
            <FilterSwitchRow
              label="Registration open"
              description="Only tournaments accepting sign-ups"
              checked={registrationOpenOnly}
              onCheckedChange={onRegistrationOpenOnlyChange}
            />
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
            <div className="grid grid-cols-3 gap-2">
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
