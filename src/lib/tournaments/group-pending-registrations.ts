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

export type RegistrationSchoolFields = {
  id: string;
  status: string;
  teamId: string;
  teamUniversity: string;
  schoolId: string | null;
  schoolName: string | null;
};

export type PendingSchoolGroup<T extends RegistrationSchoolFields> = {
  key: string;
  label: string;
  /** Shown under the school name when linked to a school program. */
  subtitle: string | null;
  registrations: T[];
};

export function groupPendingRegistrationsBySchool<T extends RegistrationSchoolFields>(
  registrations: T[]
): PendingSchoolGroup<T>[] {
  const map = new Map<string, PendingSchoolGroup<T>>();

  for (const reg of registrations) {
    const key = reg.schoolId ?? `team:${reg.teamId}`;
    const label = reg.schoolName ?? reg.teamUniversity;
    const subtitle = reg.schoolId ? reg.teamUniversity : null;
    const existing = map.get(key);
    if (existing) {
      existing.registrations.push(reg);
    } else {
      map.set(key, {
        key,
        label,
        subtitle,
        registrations: [reg],
      });
    }
  }

  return [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  );
}
