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

export const USER_PLAYER_GENDERS = ["male", "female"] as const;

export const VOLLEYBALL_POSITIONS = [
  "outside_hitter",
  "middle_blocker",
  "opposite_hitter",
  "setter",
  "libero_ds",
] as const;

export const USER_PLAYER_GENDER_LABELS: Record<
  (typeof USER_PLAYER_GENDERS)[number],
  string
> = {
  male: "Male",
  female: "Female",
};

export const VOLLEYBALL_POSITION_LABELS: Record<
  (typeof VOLLEYBALL_POSITIONS)[number],
  string
> = {
  outside_hitter: "Outside hitter",
  middle_blocker: "Middle blocker",
  opposite_hitter: "Opposite hitter",
  setter: "Setter",
  libero_ds: "Libero / DS",
};
