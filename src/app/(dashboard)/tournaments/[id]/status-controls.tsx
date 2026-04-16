"use client";

import { Button } from "@/components/ui/button";
import { updateTournamentStatus } from "../actions";
import { useState } from "react";
import type { TournamentStatus } from "@/types";

const nextStatus: Record<TournamentStatus, TournamentStatus | null> = {
  draft: "registration_open",
  registration_open: "registration_closed",
  registration_closed: "in_progress",
  in_progress: "completed",
  completed: null,
};

const statusLabels: Record<TournamentStatus, string> = {
  draft: "Open Registration",
  registration_open: "Close Registration",
  registration_closed: "Start Tournament",
  in_progress: "Complete Tournament",
  completed: "",
};

export function StatusControls({
  tournamentId,
  currentStatus,
}: {
  tournamentId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const next = nextStatus[currentStatus as TournamentStatus];

  if (!next) return null;

  async function handleAdvance() {
    if (!next) return;
    setLoading(true);
    await updateTournamentStatus(tournamentId, next);
    setLoading(false);
  }

  return (
    <Button onClick={handleAdvance} disabled={loading}>
      {loading
        ? "Updating..."
        : statusLabels[currentStatus as TournamentStatus]}
    </Button>
  );
}
