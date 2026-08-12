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

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="fixed top-2 left-2 z-50 -translate-y-20 rounded-md bg-background px-3 py-2 text-sm font-semibold text-foreground ring-2 ring-ring transition-transform focus:translate-y-0 focus:outline-none motion-reduce:transition-none"
    >
      Skip to content
    </a>
  );
}
