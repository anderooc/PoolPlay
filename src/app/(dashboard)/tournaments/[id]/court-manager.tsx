"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { addCourt, removeCourt } from "../actions";

interface Court {
  id: string;
  name: string;
  /** Division names this court is assigned to (alphabetical from server) */
  divisionNames: string[];
}

export function CourtManager({
  tournamentId,
  courts,
  isOrganizer,
}: {
  tournamentId: string;
  courts: Court[];
  isOrganizer: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await addCourt(tournamentId, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setShowForm(false);
    setLoading(false);
  }

  async function handleRemove(courtId: string) {
    await removeCourt(tournamentId, courtId);
  }

  return (
    <div className="space-y-4">
      {courts.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No courts added yet.</p>
            {isOrganizer && (
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => setShowForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Court
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {courts.map((court) => (
              <div
                key={court.id}
                className="inline-flex max-w-[min(100%,18rem)] items-start gap-1 rounded-md border border-border/70 bg-transparent px-2 py-1 text-xs text-foreground"
              >
                <span className="min-w-0 flex-1 flex flex-col gap-px">
                  <span className="font-medium leading-tight break-words">
                    {court.name}
                  </span>
                  {court.divisionNames.length > 0 && (
                    <span className="text-[0.65rem] font-normal leading-tight text-muted-foreground break-words">
                      {court.divisionNames.join(", ")}
                    </span>
                  )}
                </span>
                {isOrganizer && (
                  <button
                    type="button"
                    onClick={() => handleRemove(court.id)}
                    className="-m-0.5 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-destructive"
                    aria-label={`Remove ${court.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOrganizer && !showForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Court
            </Button>
          )}
        </>
      )}

      {showForm && (
        <form action={handleAdd} className="space-y-2">
          <div className="flex gap-2 items-end">
            <Input name="name" placeholder="Court 1" required className="w-48" />
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      )}
    </div>
  );
}
