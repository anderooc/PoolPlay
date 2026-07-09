"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatTeamGender, formatTeamRegion } from "@/lib/labels/team";
import type {
  SchoolVerificationStatus,
  TeamGender,
  TeamRegion,
} from "@/types";
import { SchoolListFilters } from "./school-list-filters";

export type SchoolSearchItem = {
  id: string;
  slug: string;
  name: string;
  university: string;
  gender: TeamGender;
  region: TeamRegion;
  verificationStatus: SchoolVerificationStatus;
  teamCount: number;
};

function toggleSetValue<T extends string>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function matchesQuery(school: SchoolSearchItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    school.name.toLowerCase().includes(q) ||
    school.university.toLowerCase().includes(q)
  );
}

function matchesFilters(
  school: SchoolSearchItem,
  genderFilter: ReadonlySet<TeamGender>,
  regionFilter: ReadonlySet<TeamRegion>,
  verificationFilter: ReadonlySet<SchoolVerificationStatus>
): boolean {
  if (genderFilter.size > 0 && !genderFilter.has(school.gender)) {
    return false;
  }
  if (regionFilter.size > 0 && !regionFilter.has(school.region)) {
    return false;
  }
  if (
    verificationFilter.size > 0 &&
    !verificationFilter.has(school.verificationStatus)
  ) {
    return false;
  }
  return true;
}

export function SchoolSearchGrid({ schools }: { schools: SchoolSearchItem[] }) {
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<Set<TeamGender>>(
    () => new Set()
  );
  const [regionFilter, setRegionFilter] = useState<Set<TeamRegion>>(
    () => new Set()
  );
  const [verificationFilter, setVerificationFilter] = useState<
    Set<SchoolVerificationStatus>
  >(() => new Set());

  const hasSearchCriteria =
    query.trim().length > 0 ||
    genderFilter.size > 0 ||
    regionFilter.size > 0 ||
    verificationFilter.size > 0;

  const filtered = useMemo(
    () =>
      schools.filter(
        (school) =>
          matchesQuery(school, query) &&
          matchesFilters(school, genderFilter, regionFilter, verificationFilter)
      ),
    [schools, query, genderFilter, regionFilter, verificationFilter]
  );

  if (schools.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No schools yet"
        description="Create a school to manage all your club's teams and roster from one place."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by school or university…"
            className="h-10 pl-9 shadow-sm"
            aria-label="Search schools"
          />
        </div>

        <SchoolListFilters
          genderFilter={genderFilter}
          regionFilter={regionFilter}
          verificationFilter={verificationFilter}
          onToggleGender={(value) =>
            setGenderFilter((prev) => toggleSetValue(prev, value))
          }
          onToggleRegion={(value) =>
            setRegionFilter((prev) => toggleSetValue(prev, value))
          }
          onToggleVerification={(value) =>
            setVerificationFilter((prev) => toggleSetValue(prev, value))
          }
          onClear={() => {
            setGenderFilter(new Set());
            setRegionFilter(new Set());
            setVerificationFilter(new Set());
          }}
        />
      </div>

      {!hasSearchCriteria ? (
        <EmptyState
          icon={Search}
          title="Search or filter schools"
          description="Type a school or university name, or use filters for gender, region, and verification status."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No matches"
          description={
            query.trim()
              ? `Nothing matches "${query.trim()}". Try different words or filters.`
              : "No schools match the selected filters. Try adjusting or clearing filters."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((school) => (
            <Link key={school.id} href={`/schools/${school.slug}`}>
              <Card className="h-full cursor-pointer transition-colors duration-150 hover:bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg leading-tight">
                    {school.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {school.university}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">
                      {formatTeamGender(school.gender)}
                    </Badge>
                    <Badge variant="outline">
                      {formatTeamRegion(school.region)}
                    </Badge>
                    <StatusBadge
                      kind="verification"
                      status={school.verificationStatus}
                    />
                    <span className="text-xs text-muted-foreground">
                      {school.teamCount} team
                      {school.teamCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
