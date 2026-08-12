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

/** Strip characters that could break or inject into Content-Disposition headers. */
export function sanitizeDownloadFilename(filename: string, fallback: string): string {
  const trimmed = filename.trim().replace(/[\r\n"\\]/g, "");
  const safe = trimmed.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 200);
  return safe.length > 0 ? safe : fallback;
}

export function contentDispositionHeader(
  filename: string,
  options?: { inline?: boolean; fallback?: string }
): string {
  const safe = sanitizeDownloadFilename(
    filename,
    options?.fallback ?? "download"
  );
  const type = options?.inline ? "inline" : "attachment";
  return `${type}; filename="${safe}"`;
}
