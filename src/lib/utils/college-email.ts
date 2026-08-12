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

/**
 * Returns true if the email appears to use an institutional / academic domain.
 * Signup is restricted to these patterns; adjust the list if you need more regions.
 */
export function isCollegeEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1) return false;
  const domain = trimmed.slice(at + 1);
  if (!domain || domain.includes("..")) return false;

  const academicSuffixes = [
    ".edu", // US and some international
    ".ac.uk",
    ".edu.au",
    ".ac.nz",
    ".edu.sg",
    ".ac.za",
  ];

  return academicSuffixes.some((suffix) => domain.endsWith(suffix));
}
