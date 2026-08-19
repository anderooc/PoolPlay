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

/** Returns the email's lowercased domain, or null if invalid. */
export function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return null;
  return trimmed.slice(at + 1);
}

function normalizeDomainHint(
  domainHint: string | null | undefined
): string | null {
  if (!domainHint) return null;
  const hint = domainHint.trim().toLowerCase().replace(/^@+/, "");
  return hint.length > 0 ? hint : null;
}

/** Case-insensitive exact match between an email's domain and a stored domain hint. */
export function emailMatchesDomain(
  email: string | null | undefined,
  domainHint: string | null | undefined
): boolean {
  const dom = emailDomain(email);
  const hint = normalizeDomainHint(domainHint);
  if (!dom || !hint) return false;
  return dom === hint;
}

/**
 * Join-request match: exact domain, or a subdomain of the school's hint
 * (`g.ucla.edu` matches `ucla.edu`; `notucla.edu` does not).
 */
export function emailMatchesSchoolDomain(
  email: string | null | undefined,
  domainHint: string | null | undefined
): boolean {
  const dom = emailDomain(email);
  const hint = normalizeDomainHint(domainHint);
  if (!dom || !hint) return false;
  return dom === hint || dom.endsWith(`.${hint}`);
}
