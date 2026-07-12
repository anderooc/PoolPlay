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
        <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
      )}
    </Link>
  );
}
