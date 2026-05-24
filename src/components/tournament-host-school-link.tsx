import Link from "next/link";
import { Building2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TournamentHostSchool } from "@/lib/tournaments/host-school";

export function TournamentHostSchoolLink({
  school,
  className,
}: {
  school: TournamentHostSchool | null | undefined;
  className?: string;
}) {
  if (!school) return null;

  return (
    <Link
      href={`/schools/${school.slug}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        className
      )}
    >
      <Building2 className="h-3 w-3 shrink-0" />
      <span>Hosted by {school.name}</span>
      {school.verificationStatus === "verified" && (
        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
      )}
    </Link>
  );
}
