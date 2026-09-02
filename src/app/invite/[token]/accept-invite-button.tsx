"use client";

/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "./actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await acceptInviteAction(token);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {pending ? "Accepting…" : "Accept invite"}
      </Button>
    </div>
  );
}
