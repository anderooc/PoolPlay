"use client";

/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "./actions";

export function AccountDeletionForm() {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await deleteAccount(new FormData(event.currentTarget));
    setLoading(false);
    if (result?.error) setError(result.error);
  }

  return (
    <Card className="border-destructive/40 shadow-none">
      <CardHeader>
        <CardTitle className="text-xl font-semibold tracking-tight">
          Delete account
        </CardTitle>
        <CardDescription>
          Remove your login, profile details, memberships, and chat messages.
          Tournament records you organized are retained under an anonymous
          account so schedules and results stay intact.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!expanded ? (
          <Button variant="destructive" onClick={() => setExpanded(true)}>
            Start account deletion
          </Button>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" aria-busy={loading}>
            <p className="text-sm text-foreground">
              This cannot be undone. Type <strong>DELETE</strong> and enter
              your password to confirm.
            </p>
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">Confirmation</Label>
              <Input
                id="delete-confirmation"
                name="confirmation"
                autoComplete="off"
                placeholder="DELETE"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-password">Current password</Label>
              <Input
                id="delete-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading ? "Deleting account…" : "Permanently delete account"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => {
                  setExpanded(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
