"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { addCourt, removeCourt } from "../actions";

interface Court {
  id: string;
  name: string;
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
              <Badge
                key={court.id}
                variant="secondary"
                className="text-sm py-1.5 px-3 gap-1"
              >
                {court.name}
                {isOrganizer && (
                  <button
                    onClick={() => handleRemove(court.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
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
