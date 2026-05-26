import { formatSnakeCaseLabel } from "@/lib/utils/format-label";

const BRACKET_TYPE_LABELS: Record<string, string> = {
  single_elimination: "Single elimination",
  double_elimination: "Double elimination",
};

export function formatBracketTypeLabel(type: string): string {
  return BRACKET_TYPE_LABELS[type] ?? formatSnakeCaseLabel(type);
}
