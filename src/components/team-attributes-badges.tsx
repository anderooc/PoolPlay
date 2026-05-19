import { Badge } from "@/components/ui/badge";
import { formatTeamGender, formatTeamRegion } from "@/lib/labels/team";
import { cn } from "@/lib/utils";
import type { TeamGender, TeamRegion } from "@/types";

export function TeamAttributesBadges({
  gender,
  region,
  className,
}: {
  gender: TeamGender;
  region: TeamRegion;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <Badge variant="secondary">{formatTeamGender(gender)}</Badge>
      <Badge variant="outline">{formatTeamRegion(region)}</Badge>
    </div>
  );
}
