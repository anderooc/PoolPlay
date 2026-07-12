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

import { and, asc, count, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, teams } from "@/lib/db/schema";
import type { SchoolVerificationStatus, TeamGender, TeamRegion } from "@/types";

export const SCHOOL_SEARCH_PAGE_SIZE = 24;

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

export type SchoolSearchInput = {
  query?: string;
  genders?: TeamGender[];
  regions?: TeamRegion[];
  verificationStatuses?: SchoolVerificationStatus[];
  limit?: number;
  offset?: number;
};

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function buildSchoolSearchConditions(input: SchoolSearchInput) {
  const conditions = [];

  const q = input.query?.trim();
  if (q) {
    const pattern = `%${escapeIlikePattern(q)}%`;
    conditions.push(
      or(ilike(schools.name, pattern), ilike(schools.university, pattern))
    );
  }

  if (input.genders?.length) {
    conditions.push(inArray(schools.gender, input.genders));
  }

  if (input.regions?.length) {
    conditions.push(inArray(schools.region, input.regions));
  }

  if (input.verificationStatuses?.length) {
    conditions.push(
      inArray(schools.verificationStatus, input.verificationStatuses)
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export function hasSchoolSearchCriteria(input: SchoolSearchInput): boolean {
  return Boolean(
    input.query?.trim() ||
      input.genders?.length ||
      input.regions?.length ||
      input.verificationStatuses?.length
  );
}

export async function countSchools(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(schools);
  return row?.value ?? 0;
}

export async function searchSchools(input: SchoolSearchInput): Promise<{
  schools: SchoolSearchItem[];
  total: number;
  limit: number;
  offset: number;
}> {
  const limit = Math.min(
    Math.max(input.limit ?? SCHOOL_SEARCH_PAGE_SIZE, 1),
    50
  );
  const offset = Math.max(input.offset ?? 0, 0);
  const where = buildSchoolSearchConditions(input);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: schools.id,
        slug: schools.slug,
        name: schools.name,
        university: schools.university,
        gender: schools.gender,
        region: schools.region,
        verificationStatus: schools.verificationStatus,
        teamCount: count(teams.id),
      })
      .from(schools)
      .leftJoin(teams, eq(teams.schoolId, schools.id))
      .where(where)
      .groupBy(schools.id)
      .orderBy(asc(schools.name))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(schools).where(where),
  ]);

  return {
    schools: rows,
    total: totalRow[0]?.value ?? 0,
    limit,
    offset,
  };
}
