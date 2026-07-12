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

import { createAdminClient, TOURNAMENT_WAIVER_BUCKET } from "@/lib/supabase/admin";

export function tournamentWaiverStoragePath(
  tournamentId: string,
  waiverId: string
): string {
  return `${tournamentId}/${waiverId}.pdf`;
}

export async function uploadTournamentWaiverPdf(
  storagePath: string,
  bytes: Uint8Array,
  contentType = "application/pdf"
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(TOURNAMENT_WAIVER_BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function downloadTournamentWaiverPdf(
  storagePath: string
): Promise<Uint8Array> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(TOURNAMENT_WAIVER_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(error?.message ?? "Waiver file not found");
  }

  const buffer = await data.arrayBuffer();
  return new Uint8Array(buffer);
}
