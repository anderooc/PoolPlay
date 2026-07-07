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
