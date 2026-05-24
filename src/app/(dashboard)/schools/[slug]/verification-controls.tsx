"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { submitForVerification } from "../actions";

export function VerificationControls({
  schoolId,
  canSubmit,
  blockedReason,
  status,
}: {
  schoolId: string;
  canSubmit: boolean;
  blockedReason: string | null;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (status === "verified") return null;

  async function handleSubmit() {
    setLoading(true);
    const result = await submitForVerification(schoolId);
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Submitted for verification. An admin will review it.");
    router.refresh();
  }

  const showBlockedHint = !canSubmit && !!blockedReason;

  return (
    <div className="group relative shrink-0">
      <Button
        type="button"
        variant="default"
        size="sm"
        disabled={!canSubmit || loading}
        onClick={handleSubmit}
        title={showBlockedHint ? blockedReason : undefined}
        aria-describedby={showBlockedHint ? "verification-blocked-hint" : undefined}
      >
        {loading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <ShieldCheck className="mr-1 h-3 w-3" />
        )}
        {status === "rejected"
          ? "Resubmit for verification"
          : "Submit for verification"}
      </Button>
      {showBlockedHint && (
        <div
          id="verification-blocked-hint"
          role="tooltip"
          className={cn(
            "pointer-events-none absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border bg-popover p-2.5 text-xs leading-snug text-muted-foreground shadow-md ring-1 ring-foreground/10",
            "opacity-0 transition-opacity duration-150",
            "group-hover:opacity-100 group-focus-within:opacity-100"
          )}
        >
          {blockedReason}
        </div>
      )}
    </div>
  );
}
