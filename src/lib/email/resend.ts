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

import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is required to send tournament emails. Add it to your environment."
    );
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export function tournamentEmailFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL ?? "PoolPlay <onboarding@resend.dev>"
  );
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

export function tournamentPageUrl(slug: string, tab?: string): string {
  const base = `${appBaseUrl()}/tournaments/${slug}`;
  if (!tab || tab === "setup") return base;
  return `${base}?tab=${tab}`;
}

export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<div style="font-family: sans-serif; line-height: 1.5; color: #1a1a1a;">${escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin: 0 0 1em;">${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("")}</div>`;
}

export function emailFooterHtml(tournamentName: string): string {
  return `<p style="margin-top: 2em; font-size: 12px; color: #666;">You received this because you are listed as a team captain for ${escapeHtml(tournamentName)} on PoolPlay.</p>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatCaptainTeamLabels(recipient: {
  teamNames: string[];
  teamUniversities: string[];
}): string {
  return recipient.teamNames
    .map((name, index) => {
      const university = recipient.teamUniversities[index];
      return university ? `${name} (${university})` : name;
    })
    .join(", ");
}

export function formatTournamentEmailSubject(
  tournamentName: string,
  subject: string
): string {
  const trimmed = subject.trim();
  const prefix = `[${tournamentName}]`;
  if (trimmed.toLowerCase().includes(tournamentName.trim().toLowerCase())) {
    return trimmed;
  }
  const combined = `${prefix} ${trimmed}`;
  if (combined.length <= 200) return combined;
  const available = 200 - prefix.length - 1;
  return `${prefix} ${trimmed.slice(0, Math.max(available, 0))}`.trimEnd();
}

export function buildTournamentEmailHeaderText(input: {
  tournamentName: string;
  dateDisplay: string;
  location: string;
  teamLabels: string;
}): string {
  return `${input.tournamentName}
${input.dateDisplay} · ${input.location}
For: ${input.teamLabels}`;
}

export function buildTournamentEmailHeaderHtml(input: {
  tournamentName: string;
  dateDisplay: string;
  location: string;
  teamLabels: string;
}): string {
  return `<div style="margin: 0 0 1.25em; padding-bottom: 1em; border-bottom: 1px solid #e5e5e5;">
  <p style="margin: 0 0 0.35em; font-size: 16px; font-weight: 600; color: #111;">${escapeHtml(input.tournamentName)}</p>
  <p style="margin: 0 0 0.35em; font-size: 13px; color: #555;">${escapeHtml(input.dateDisplay)} · ${escapeHtml(input.location)}</p>
  <p style="margin: 0; font-size: 13px; color: #444;"><strong>For:</strong> ${escapeHtml(input.teamLabels)}</p>
</div>`;
}

export function buildCaptainEmailHtml(input: {
  body: string;
  tournamentName: string;
  dateDisplay: string;
  location: string;
  teamLabels: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const header = buildTournamentEmailHeaderHtml({
    tournamentName: input.tournamentName,
    dateDisplay: input.dateDisplay,
    location: input.location,
    teamLabels: input.teamLabels,
  });

  const cta =
    input.ctaUrl && input.ctaLabel
      ? `<p style="margin: 1.5em 0;"><a href="${escapeHtml(input.ctaUrl)}" style="display: inline-block; padding: 10px 16px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">${escapeHtml(input.ctaLabel)}</a></p>`
      : "";

  return `${header}${plainTextToHtml(input.body)}${cta}${emailFooterHtml(input.tournamentName)}`;
}

export function buildCaptainEmailText(input: {
  body: string;
  tournamentName: string;
  dateDisplay: string;
  location: string;
  teamLabels: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const header = buildTournamentEmailHeaderText({
    tournamentName: input.tournamentName,
    dateDisplay: input.dateDisplay,
    location: input.location,
    teamLabels: input.teamLabels,
  });

  const cta =
    input.ctaUrl && input.ctaLabel
      ? `\n\n${input.ctaLabel}: ${input.ctaUrl}`
      : "";

  const footer = `\n\n---\nYou received this because you are listed as a team captain for ${input.tournamentName} on PoolPlay.`;

  return `${header}\n\n${input.body}${cta}${footer}`;
}
