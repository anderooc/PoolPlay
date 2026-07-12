"use client";

/*
 * PoolPlay - Collegiate club volleyball tournament hub
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

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatTeamGender, formatTeamRegion } from "@/lib/labels/team";
import type {
  SchoolVerificationStatus,
  TeamGender,
  TeamRegion,
} from "@/types";
import type { SchoolSearchItem } from "@/lib/schools/search";
import { searchSchoolsForDiscovery } from "./actions";
import { SchoolListFilters } from "./school-list-filters";

const SEARCH_DEBOUNCE_MS = 300;

function toggleSetValue<T extends string>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function SchoolCard({ school }: { school: SchoolSearchItem }) {
  return (
    <Link href={`/schools/${school.slug}`}>
      <Card className="h-full cursor-pointer transition-colors duration-150 hover:bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg leading-tight">{school.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{school.university}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{formatTeamGender(school.gender)}</Badge>
            <Badge variant="outline">{formatTeamRegion(school.region)}</Badge>
            <StatusBadge
              kind="verification"
              status={school.verificationStatus}
            />
            <span className="text-xs text-muted-foreground">
              {school.teamCount} team{school.teamCount === 1 ? "" : "s"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function SchoolSearchGrid({ hasSchools }: { hasSchools: boolean }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<Set<TeamGender>>(
    () => new Set()
  );
  const [regionFilter, setRegionFilter] = useState<Set<TeamRegion>>(
    () => new Set()
  );
  const [verificationFilter, setVerificationFilter] = useState<
    Set<SchoolVerificationStatus>
  >(() => new Set());
  const [results, setResults] = useState<SchoolSearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const searchInput = useMemo(
    () => ({
      query: debouncedQuery,
      genders: [...genderFilter],
      regions: [...regionFilter],
      verificationStatuses: [...verificationFilter],
    }),
    [debouncedQuery, genderFilter, regionFilter, verificationFilter]
  );

  const hasSearchCriteria =
    debouncedQuery.trim().length > 0 ||
    genderFilter.size > 0 ||
    regionFilter.size > 0 ||
    verificationFilter.size > 0;

  const searchKey = useMemo(
    () =>
      JSON.stringify({
        query: debouncedQuery.trim(),
        genders: [...genderFilter].sort(),
        regions: [...regionFilter].sort(),
        verificationStatuses: [...verificationFilter].sort(),
      }),
    [debouncedQuery, genderFilter, regionFilter, verificationFilter]
  );

  useEffect(() => {
    if (!hasSearchCriteria) {
      setResults([]);
      setTotal(0);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void searchSchoolsForDiscovery({ ...searchInput, offset: 0 }).then(
      (response) => {
        if (cancelled) return;
        if ("error" in response) {
          setError(response.error);
          setResults([]);
          setTotal(0);
        } else {
          setResults(response.schools);
          setTotal(response.total);
          setError(null);
        }
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [hasSearchCriteria, searchKey, searchInput]);

  const loadMore = useCallback(async () => {
    if (!hasSearchCriteria || loadingMore || results.length >= total) return;

    setLoadingMore(true);
    setError(null);

    const response = await searchSchoolsForDiscovery({
      ...searchInput,
      offset: results.length,
    });

    if ("error" in response) {
      setError(response.error);
    } else {
      setResults((prev) => [...prev, ...response.schools]);
      setTotal(response.total);
    }

    setLoadingMore(false);
  }, [hasSearchCriteria, loadingMore, results.length, searchInput, total]);

  if (!hasSchools) {
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
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Searching schools…
        </div>
      ) : error ? (
        <EmptyState
          icon={Building2}
          title="Search failed"
          description={error}
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No matches"
          description={
            debouncedQuery.trim()
              ? `Nothing matches "${debouncedQuery.trim()}". Try different words or filters.`
              : "No schools match the selected filters. Try adjusting or clearing filters."
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {total === 1 ? "1 school" : `${total} schools`}
            {results.length < total
              ? ` · showing ${results.length}`
              : null}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((school) => (
              <SchoolCard key={school.id} school={school} />
            ))}
          </div>
          {results.length < total ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  `Load more (${total - results.length} remaining)`
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
