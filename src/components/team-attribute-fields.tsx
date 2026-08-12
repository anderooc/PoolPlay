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

import { Label } from "@/components/ui/label";
import {
  TEAM_GENDERS,
  TEAM_REGIONS,
  TEAM_GENDER_LABELS,
  TEAM_REGION_LABELS,
} from "@/lib/constants/team";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-50"
);

export function TeamAttributeFields({
  genderName = "gender",
  regionName = "region",
  genderDefault,
  regionDefault,
  required = true,
}: {
  genderName?: string;
  regionName?: string;
  genderDefault?: string;
  regionDefault?: string;
  required?: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={genderName}>Gender</Label>
        <select
          id={genderName}
          name={genderName}
          className={selectClassName}
          defaultValue={genderDefault}
          required={required}
        >
          <option value="" disabled>
            Select gender
          </option>
          {TEAM_GENDERS.map((value) => (
            <option key={value} value={value}>
              {TEAM_GENDER_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={regionName}>Region</Label>
        <select
          id={regionName}
          name={regionName}
          className={selectClassName}
          defaultValue={regionDefault}
          required={required}
        >
          <option value="" disabled>
            Select region
          </option>
          {TEAM_REGIONS.map((value) => (
            <option key={value} value={value}>
              {TEAM_REGION_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
