/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import { requireViewer } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { buildTournamentRegistrationsCsv } from "@/lib/api/queries/tournament-host-registrations-export";
import { contentDispositionHeader } from "@/lib/security/content-disposition";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export const GET = apiHandler(async (request: Request, context: RouteContext) => {
  const { user } = await requireViewer(request);
  const { slug } = await context.params;
  const result = await buildTournamentRegistrationsCsv(slug, user);
  if ("error" in result) {
    return new Response(result.error, { status: 403 });
  }

  return new Response(result.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": contentDispositionHeader(result.filename),
    },
  });
});
