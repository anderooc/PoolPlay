import { formatSnakeCaseLabel } from "@/lib/utils/format-label";

const MATCH_STATUS_LABELS: Record<string, string> = {
  upcoming: "Upcoming",
  paused: "Paused",
  in_progress: "In progress",
  completed: "Completed",
};

export function formatMatchStatusLabel(status: string): string {
  return MATCH_STATUS_LABELS[status] ?? formatSnakeCaseLabel(status);
}
