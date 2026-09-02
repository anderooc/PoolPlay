"use client";

/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import { Download } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RegistrationExportButton({
  tournamentSlug,
}: {
  tournamentSlug: string;
}) {
  return (
    <Link
      href={`/api/v1/tournaments/${tournamentSlug}/host/registrations/export`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      <Download className="mr-1.5 h-3.5 w-3.5" />
      Export CSV
    </Link>
  );
}
