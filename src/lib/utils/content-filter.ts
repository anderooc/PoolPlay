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

const BLOCKED_WORDS = [
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "blowjob",
  "bollock",
  "bollok",
  "boner",
  "boob",
  "bugger",
  "bum",
  "butt",
  "buttplug",
  "clitoris",
  "cock",
  "coon",
  "crap",
  "cunt",
  "damn",
  "dick",
  "dildo",
  "dyke",
  "fag",
  "faggot",
  "feck",
  "felch",
  "fellate",
  "fellatio",
  "flange",
  "fuck",
  "fudgepacker",
  "goddamn",
  "godsdamn",
  "hell",
  "homo",
  "jerk",
  "jizz",
  "knobend",
  "labia",
  "muff",
  "nazi",
  "nigger",
  "nigga",
  "omg",
  "penis",
  "piss",
  "poop",
  "prick",
  "pube",
  "pussy",
  "queer",
  "retard",
  "scrotum",
  "sex",
  "shit",
  "slut",
  "smegma",
  "spunk",
  "testicle",
  "tit",
  "tosser",
  "turd",
  "twat",
  "vagina",
  "wank",
  "whore",
  "wtf",
];

const pattern = new RegExp(
  `\\b(${BLOCKED_WORDS.join("|")})\\b`,
  "i"
);

/**
 * Returns the first blocked word found in the input, or null if clean.
 * Matches whole words only, case-insensitive.
 */
export function findBlockedWord(text: string): string | null {
  const match = text.match(pattern);
  return match ? match[1] : null;
}

/**
 * Checks multiple text fields at once.
 * Returns an error message string if any field contains explicit content, or null if all clean.
 */
export function checkContentFilter(
  ...values: (string | null | undefined)[]
): string | null {
  for (const value of values) {
    if (!value) continue;
    const blocked = findBlockedWord(value);
    if (blocked) {
      return "Inappropriate language is not allowed. Please remove offensive words and try again.";
    }
  }
  return null;
}
