/*
 * ShootSet - Collegiate club volleyball tournament hub
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
 * Turns snake_case enum values into readable labels, e.g.
 * `registration_open` → "Registration open".
 */
export function formatSnakeCaseLabel(value: string): string {
  const normalized = value.replace(/_/g, " ").trim().replace(/\s+/g, " ");
  if (!normalized) return normalized;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}
