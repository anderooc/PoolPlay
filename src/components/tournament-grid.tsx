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

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useLayoutEffect,
  useEffect,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { TeamAttributesBadges } from "@/components/team-attributes-badges";
import { TournamentHostSchoolLink } from "@/components/tournament-host-school-link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatISODateLabel,
  formatTournamentDateDisplay,
  parseISODate,
  toISODate,
} from "@/lib/date-iso";
import {
  TournamentListFilters,
  countActiveTournamentFilters,
} from "@/components/tournament-list-filters";
import { Calendar, MapPin, Search, Trophy } from "lucide-react";
import { ViewportSplit } from "@/components/layout/viewport-split";
import { cn } from "@/lib/utils";
import { isTournamentArchived, todayISO } from "@/lib/tournament-status";
import type { TeamGender, TeamRegion } from "@/types";
import type { TournamentHostSchool } from "@/lib/tournaments/host-school";
import type { PublicRegistrationAvailability } from "@/lib/tournaments/public-projection";
import { registrationAvailabilityOpen } from "@/lib/tournaments/public-refresh-policy";

const DateScrollWheel = dynamic(
  () =>
    import("@/components/date-scroll-wheel").then((mod) => ({
      default: mod.DateScrollWheel,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[180px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
        aria-hidden
      >
        Loading schedule…
      </div>
    ),
  }
);

const DatePickerCalendar = dynamic(
  () =>
    import("@/components/date-picker").then((mod) => ({
      default: mod.DatePickerCalendar,
    })),
  {
    loading: () => <div className="h-[280px] w-[280px]" aria-hidden />,
  }
);

/**
 * Distance from the top of the schedule container to the active date
 * heading. Leaves room for the previous day's heading to peek above
 * without crowding the top edge.
 */
const SCHEDULE_TOP_INSET = 96;

/** Min height for the selected-day panel so empty and tournament days match. */
const SELECTED_PANEL_MIN_H =
  "min-h-[5.5rem] min-w-0 w-full max-w-full";

/**
 * Accumulated wheel deltaY (px) required before moving to the next/previous
 * date. Higher = more scrolling per date, easier to land on adjacent days.
 */
const WHEEL_DELTA_PER_DATE = 120;

interface Tournament {
  id?: string;
  slug: string;
  name: string;
  description: string | null;
  location: string;
  date: string;
  status: string;
  gender: TeamGender;
  region: TeamRegion;
  hostSchool?: TournamentHostSchool | null;
  registrationAvailability: PublicRegistrationAvailability;
}

interface TournamentFilters {
  query: string;
  genderFilter: Set<TeamGender>;
  regionFilter: Set<TeamRegion>;
  hideArchived: boolean;
  registrationOpenOnly: boolean;
  today: string;
  now: string;
}

function toggleSetValue<T extends string>(
  set: Set<T>,
  value: T
): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function formatDate(dateStr: string) {
  return formatTournamentDateDisplay(dateStr, { weekday: true });
}

function registrationAvailabilityLabel(
  availability: PublicRegistrationAvailability
): string {
  const registered = availability.capacity == null
    ? `${availability.registeredCount} registered`
    : `${availability.registeredCount} / ${availability.capacity} registered`;
  return `${registered} · ${availability.waitlistCount} waiting`;
}

export function filterTournamentList(
  tournaments: Tournament[],
  filters: TournamentFilters
): Tournament[] {
  let list = tournaments;
  const query = filters.query.trim().toLowerCase();
  if (query) {
    list = list.filter(
      (tournament) =>
        tournament.name.toLowerCase().includes(query) ||
        tournament.location.toLowerCase().includes(query) ||
        tournament.description?.toLowerCase().includes(query)
    );
  }
  if (filters.hideArchived) {
    list = list.filter(
      (tournament) => !isTournamentArchived(tournament.date, filters.today)
    );
  }
  if (filters.registrationOpenOnly) {
    list = list.filter(
      (tournament) =>
        !isTournamentArchived(tournament.date, filters.today) &&
        registrationAvailabilityOpen(
          tournament.status,
          tournament.registrationAvailability,
          filters.now
        )
    );
  }
  if (filters.genderFilter.size > 0) {
    list = list.filter((tournament) =>
      filters.genderFilter.has(tournament.gender)
    );
  }
  if (filters.regionFilter.size > 0) {
    list = list.filter((tournament) =>
      filters.regionFilter.has(tournament.region)
    );
  }
  return list;
}

interface DateGroup {
  date: string;
  tournaments: Tournament[];
}

function groupByDate(list: Tournament[]): DateGroup[] {
  const map = new Map<string, Tournament[]>();
  for (const t of list) {
    const existing = map.get(t.date);
    if (existing) {
      existing.push(t);
    } else {
      map.set(t.date, [t]);
    }
  }
  return Array.from(map.entries()).map(([date, tournaments]) => ({
    date,
    tournaments,
  }));
}

function TournamentRow({
  tournament: t,
  linkPrefix,
}: {
  tournament: Tournament;
  linkPrefix: string;
}) {
  return (
    <div className="min-w-0 max-w-full px-1 py-3.5 transition-colors duration-150 hover:bg-muted/40">
      <Link href={`${linkPrefix}/${t.slug}`} className="block min-w-0">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <span className="min-w-0 truncate font-medium leading-tight">
            {t.name}
          </span>
          <StatusBadge
            kind="tournament"
            status={t.status}
            date={t.date}
            className="self-start shrink-0"
          />
        </div>
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{t.location}</span>
          </span>
          <span>{registrationAvailabilityLabel(t.registrationAvailability)}</span>
        </div>
      </Link>
      <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
        <TeamAttributesBadges gender={t.gender} region={t.region} />
        <TournamentHostSchoolLink school={t.hostSchool} />
      </div>
    </div>
  );
}

function SelectedDayPanel({
  group,
  linkPrefix,
}: {
  group: DateGroup;
  linkPrefix: string;
}) {
  const isEmpty = group.tournaments.length === 0;
  return (
    <div className={cn("w-full min-w-0", SELECTED_PANEL_MIN_H)}>
      {isEmpty ? (
        <p
          className={cn(
            "flex w-full items-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 text-sm text-muted-foreground",
            SELECTED_PANEL_MIN_H
          )}
        >
          No tournaments scheduled.
        </p>
      ) : (
        <div
          className={cn(
            "list-stack w-full border-t border-border/70",
            SELECTED_PANEL_MIN_H
          )}
        >
          {group.tournaments.map((t) => (
            <TournamentRow
              key={t.id ?? t.slug}
              tournament={t}
              linkPrefix={linkPrefix}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DateGroupSection({
  group,
  today,
  isSelected,
  linkPrefix,
  onSelectDate,
  sectionRef,
}: {
  group: DateGroup;
  today: string;
  isSelected: boolean;
  linkPrefix: string;
  onSelectDate: (date: string) => void;
  sectionRef?: (el: HTMLElement | null) => void;
}) {
  const isCalendarToday = group.date === today;
  return (
    <section
      ref={sectionRef}
      className={cn(
        "min-w-0 transition-opacity duration-300",
        isSelected ? "opacity-100" : "opacity-40"
      )}
    >
      <h3
        className={cn(
          "flex min-h-9 min-w-0 items-center gap-2 truncate text-sm transition-colors duration-300",
          isSelected
            ? "font-semibold text-foreground"
            : "font-medium text-muted-foreground"
        )}
      >
        <button
          type="button"
          onClick={() => onSelectDate(group.date)}
          className="flex min-h-9 min-w-0 flex-1 items-center gap-2 truncate text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-current={isSelected ? "date" : undefined}
        >
          {isCalendarToday && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                isSelected
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              Today
            </span>
          )}
          <span className="truncate">{formatDate(group.date)}</span>
        </button>
      </h3>
      {isSelected && (
        <div
          className={cn(
            "mt-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
          )}
        >
          <SelectedDayPanel group={group} linkPrefix={linkPrefix} />
        </div>
      )}
    </section>
  );
}

/**
 * Desktop: date cycler with headings plus a side wheel. Mobile: wheel only
 * (no heading stack) beside the selected day's tournaments.
 */
function ChronologicalSchedule({
  tournaments,
  linkPrefix,
  selectedDate,
  onSelectedDateChange,
}: {
  tournaments: Tournament[];
  linkPrefix: string;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
}) {
  const today = todayISO();

  const groups = useMemo(() => {
    const sorted = [...tournaments].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const grouped = groupByDate(sorted);

    // Always materialize today plus the active selection so empty days can
    // still be focused (e.g. from the calendar or synthesized today).
    const required = new Set<string>([today, selectedDate]);
    for (const date of required) {
      if (grouped.some((g) => g.date === date)) continue;
      const insertAt = grouped.findIndex((g) => g.date > date);
      const empty: DateGroup = { date, tournaments: [] };
      if (insertAt === -1) grouped.push(empty);
      else grouped.splice(insertAt, 0, empty);
    }

    return grouped;
  }, [tournaments, today, selectedDate]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const stackRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const layoutInitializedRef = useRef(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [wheelActivity, setWheelActivity] = useState(0);
  const registerWheelActivity = useCallback(() => {
    setWheelActivity((n) => n + 1);
  }, []);

  // If the selected date disappears (filter, day rollover) fall back to
  // today — which is always present because we synthesize it above.
  const effectiveSelectedDate = useMemo(() => {
    if (groups.some((g) => g.date === selectedDate)) return selectedDate;
    return today;
  }, [groups, selectedDate, today]);

  const selectedGroupTournamentCount =
    groups.find((g) => g.date === effectiveSelectedDate)?.tournaments.length ?? 0;

  /**
   * Moves the stack so the selected section's heading sits at the top
   * inset. First call sets the position without animation so today doesn't
   * "fly in" from the top on mount; subsequent calls animate smoothly.
   */
  useLayoutEffect(() => {
    const stack = stackRef.current;
    const el = sectionRefs.current.get(effectiveSelectedDate);
    if (!stack || !el) return;
    const offset = SCHEDULE_TOP_INSET - el.offsetTop;

    if (!layoutInitializedRef.current) {
      stack.style.transition = "none";
      stack.style.transform = `translateY(${offset}px)`;
      void stack.offsetHeight;
      stack.style.transition =
        "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";
      layoutInitializedRef.current = true;
      queueMicrotask(() => setLayoutReady(true));
    } else {
      stack.style.transform = `translateY(${offset}px)`;
    }
  }, [effectiveSelectedDate, groups, selectedGroupTournamentCount]);

  // Mouse/trackpad wheel cycles dates. Touch scrolling is left to the page;
  // the date wheel beside this list is the isolated gesture surface.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function advance(delta: number) {
      registerWheelActivity();
      const i = groups.findIndex((g) => g.date === selectedDate);
      const safeI =
        i === -1 ? groups.findIndex((g) => g.date === today) : i;
      const next = Math.max(
        0,
        Math.min(groups.length - 1, safeI + delta)
      );
      const nextDate = groups[next]?.date;
      if (nextDate) onSelectedDateChange(nextDate);
    }

    let wheelAccumulator = 0;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 1) return;
      wheelAccumulator += e.deltaY;

      while (wheelAccumulator >= WHEEL_DELTA_PER_DATE) {
        advance(1);
        wheelAccumulator -= WHEEL_DELTA_PER_DATE;
      }
      while (wheelAccumulator <= -WHEEL_DELTA_PER_DATE) {
        advance(-1);
        wheelAccumulator += WHEEL_DELTA_PER_DATE;
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [groups, today, selectedDate, onSelectedDateChange, registerWheelActivity]);

  // Arrow Up/Down moves the selected date by one. Ignored while typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      e.preventDefault();
      registerWheelActivity();
      // Drop focus so the calendar trigger (or other controls) don't keep
      // showing a focus ring while cycling dates with the keyboard.
      if (target && target !== document.body) {
        target.blur();
      }
      const i = groups.findIndex((g) => g.date === selectedDate);
      const safeI =
        i === -1 ? groups.findIndex((g) => g.date === today) : i;
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const next = Math.max(
        0,
        Math.min(groups.length - 1, safeI + delta)
      );
      const nextDate = groups[next]?.date;
      if (nextDate) onSelectedDateChange(nextDate);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groups, today, selectedDate, onSelectedDateChange, registerWheelActivity]);

  if (groups.length === 0) return null;

  const scheduleDates = groups.map((g) => g.date);

  const dateSections = (withRefs: boolean) =>
    groups.map((group) => (
      <DateGroupSection
        key={group.date}
        group={group}
        today={today}
        isSelected={group.date === effectiveSelectedDate}
        linkPrefix={linkPrefix}
        onSelectDate={onSelectedDateChange}
        sectionRef={
          withRefs
            ? (el) => {
                if (el) sectionRefs.current.set(group.date, el);
                else sectionRefs.current.delete(group.date);
              }
            : undefined
        }
      />
    ));

  const selectedGroup =
    groups.find((g) => g.date === effectiveSelectedDate) ?? {
      date: effectiveSelectedDate,
      tournaments: [] as Tournament[],
    };

  const dateWheel = (asideClassName: string) => (
    <aside
      aria-label="Date navigation"
      className={asideClassName}
    >
      <DateScrollWheel
        className="w-full max-w-full flex-none md:flex-1"
        dates={scheduleDates}
        selectedDate={effectiveSelectedDate}
        onSelect={onSelectedDateChange}
        today={today}
        activityKey={wheelActivity}
      />
    </aside>
  );

  return (
    <ViewportSplit
      mobile={
        <div className="flex min-w-0 max-w-full items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="sr-only">
              Tournaments on {formatDate(selectedGroup.date)}
            </p>
            <SelectedDayPanel group={selectedGroup} linkPrefix={linkPrefix} />
          </div>
          {dateWheel(
            "flex w-[6.75rem] shrink-0 touch-none flex-col self-start overscroll-y-none"
          )}
        </div>
      }
      desktop={
        <div
          className="flex min-h-0 w-full min-w-0 max-w-full flex-1 gap-4 overflow-x-hidden"
          style={{ visibility: layoutReady ? "visible" : "hidden" }}
        >
          {dateWheel(
            "flex w-[9.5rem] shrink-0 touch-none flex-col self-stretch overscroll-y-none md:flex-none"
          )}

          <div
            ref={containerRef}
            className="relative min-h-0 min-w-0 flex-1 select-none overflow-hidden outline-none"
            aria-roledescription="date cycler"
          >
            <div ref={stackRef} className="will-change-transform">
              <div className="space-y-3 pb-12 pt-2">{dateSections(true)}</div>
            </div>
          </div>
        </div>
      }
    />
  );
}

export function TournamentGrid({
  tournaments,
  linkPrefix = "/tournaments",
}: {
  tournaments: Tournament[];
  linkPrefix?: string;
}) {
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<Set<TeamGender>>(
    () => new Set()
  );
  const [regionFilter, setRegionFilter] = useState<Set<TeamRegion>>(
    () => new Set()
  );
  const [hideArchived, setHideArchived] = useState(false);
  const [registrationOpenOnly, setRegistrationOpenOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date().toISOString());
  const today = todayISO();

  useEffect(() => {
    setSelectedDate(today);
  }, [today]);

  useEffect(() => {
    if (!registrationOpenOnly) return;
    let timer: number | undefined;
    const refreshNow = () => {
      const currentMs = Date.now();
      setNow(new Date(currentMs).toISOString());
      const remaining = tournaments
        .map((tournament) =>
          Date.parse(tournament.registrationAvailability.deadline ?? "") - currentMs
        )
        .filter((value) => Number.isFinite(value) && value > 0);
      const delay = remaining.length === 0 ? 60_000 : Math.min(...remaining);
      timer = window.setTimeout(refreshNow, Math.max(1, Math.min(60_000, delay)));
    };
    refreshNow();
    return () => {
      if (timer != null) window.clearTimeout(timer);
    };
  }, [registrationOpenOnly, tournaments]);

  const hasActiveFilters =
    countActiveTournamentFilters({
      genderFilter,
      regionFilter,
      hideArchived,
      registrationOpenOnly,
    }) > 0;

  const filtered = useMemo(() => {
    return filterTournamentList(tournaments, {
      query,
      genderFilter,
      regionFilter,
      hideArchived,
      registrationOpenOnly,
      today,
      now,
    });
  }, [
    tournaments,
    query,
    hideArchived,
    registrationOpenOnly,
    genderFilter,
    regionFilter,
    today,
    now,
  ]);

  /** Dates (YYYY-MM-DD) that actually have tournaments — used to dot the calendar. */
  const datesWithTournaments = useMemo(() => {
    const set = new Set<string>();
    for (const t of filtered) set.add(t.date);
    return set;
  }, [filtered]);

  const hasTournamentDates = useMemo(
    () =>
      Array.from(datesWithTournaments).map((iso) => parseISODate(iso)),
    [datesWithTournaments]
  );

  const tournamentDateIsos = useMemo(
    () => tournaments.map((t) => t.date),
    [tournaments]
  );

  useEffect(() => {
    if (!calendarOpen) return;
    setCalendarMonth(parseISODate(selectedDate));
  }, [calendarOpen, selectedDate]);

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    const iso = toISODate(date);
    setSelectedDate(iso);
    setCalendarOpen(false);
    // Return focus to the page so the trigger doesn't keep a focus ring.
    requestAnimationFrame(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });

    if (!datesWithTournaments.has(iso)) {
      const label = date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      toast(`No tournaments on ${label}.`, {
        description: "Try another date from the calendar.",
      });
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-6 md:h-full">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tournaments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 rounded-md pl-9 shadow-sm"
          />
        </div>

        <TournamentListFilters
          genderFilter={genderFilter}
          regionFilter={regionFilter}
          hideArchived={hideArchived}
          registrationOpenOnly={registrationOpenOnly}
          onToggleGender={(value) =>
            setGenderFilter((prev) => toggleSetValue(prev, value))
          }
          onToggleRegion={(value) =>
            setRegionFilter((prev) => toggleSetValue(prev, value))
          }
          onHideArchivedChange={setHideArchived}
          onRegistrationOpenOnlyChange={setRegistrationOpenOnly}
          onClear={() => {
            setGenderFilter(new Set());
            setRegionFilter(new Set());
            setHideArchived(false);
            setRegistrationOpenOnly(false);
          }}
        />

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "shrink-0",
                  selectedDate !== today && "bg-muted"
                )}
                aria-label={`Calendar, ${formatISODateLabel(selectedDate)} selected`}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            }
          />
          <PopoverContent className="w-auto p-1.5" align="end">
            <DatePickerCalendar
              selected={parseISODate(selectedDate)}
              onSelect={handleDateSelect}
              rangeFromDates={tournamentDateIsos}
              markedDates={hasTournamentDates}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={
            tournaments.length === 0
              ? "No tournaments yet"
              : "No matches"
          }
          description={
            tournaments.length === 0
              ? "Check back soon for upcoming events."
              : query.trim() && hasActiveFilters
                ? `Nothing matches "${query}" with the selected filters.`
                : query.trim()
                  ? `Nothing matches "${query}". Try a different search.`
                  : hasActiveFilters
                    ? "No tournaments match your filters. Try clearing filters or showing past events."
                    : "Check back soon for upcoming events."
          }
        />
      ) : (
        <ChronologicalSchedule
          tournaments={filtered}
          linkPrefix={linkPrefix}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
        />
      )}
    </div>
  );
}
