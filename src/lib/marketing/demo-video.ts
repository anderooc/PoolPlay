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

export type TournamentDemoVideo =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "vimeo"; embedUrl: string }
  | { kind: "file"; src: string };

export const TOURNAMENT_DEMO_HIGHLIGHTS = [
  {
    title: "Set up your event",
    description:
      "Create divisions, open registration, and configure match format and warmup rules.",
  },
  {
    title: "Build pools & brackets",
    description:
      "Auto-generate pool play, seed elimination brackets, and release schedules when you're ready.",
  },
  {
    title: "Schedule every court",
    description:
      "Assign matches across courts with warmup windows baked into the timeline.",
  },
  {
    title: "Score live",
    description:
      "Enter sets from the bench or ref phone — standings and brackets update in real time.",
  },
] as const;

function parseYoutubeEmbed(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (
      parsed.hostname.endsWith("youtube.com") ||
      parsed.hostname.endsWith("youtube-nocookie.com")
    ) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const parts = parsed.pathname.split("/").filter(Boolean);
      const embedIndex = parts.indexOf("embed");
      if (embedIndex >= 0 && parts[embedIndex + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIndex + 1]}`;
      }
      const shortsIndex = parts.indexOf("shorts");
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) {
        return `https://www.youtube.com/embed/${parts[shortsIndex + 1]}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function parseVimeoEmbed(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("vimeo.com")) return null;
    const id = parsed.pathname.split("/").filter(Boolean).at(-1);
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
}

/** Set NEXT_PUBLIC_TOURNAMENT_DEMO_VIDEO_URL to a YouTube, Vimeo, or direct .mp4/.webm URL. */
export function getTournamentDemoVideo(): TournamentDemoVideo | null {
  const raw = process.env.NEXT_PUBLIC_TOURNAMENT_DEMO_VIDEO_URL?.trim();
  if (!raw) return null;

  const youtube = parseYoutubeEmbed(raw);
  if (youtube) return { kind: "youtube", embedUrl: youtube };

  const vimeo = parseVimeoEmbed(raw);
  if (vimeo) return { kind: "vimeo", embedUrl: vimeo };

  if (/\.(mp4|webm)(\?|$)/i.test(raw)) {
    return { kind: "file", src: raw };
  }

  return null;
}
