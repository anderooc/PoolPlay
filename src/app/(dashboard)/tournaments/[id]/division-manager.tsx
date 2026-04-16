"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { addDivision, removeDivision } from "../actions";

interface Division {
  id: string;
  name: string;
  format: string;
  teamCap: number | null;
}

export function DivisionManager({
  tournamentId,
  divisions,
  isOrganizer,
  isDraft,
}: {
  tournamentId: string;
  divisions: Division[];
  isOrganizer: boolean;
  isDraft: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [divisionFormat, setDivisionFormat] = useState("pool_to_bracket");

  const formatLabel: Record<string, string> = {
    pool_to_bracket: "Pool Play to Bracket",
    single_elimination: "Single Elimination",
    double_elimination: "Double Elimination",
  };

  async function handleAdd(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await addDivision(tournamentId, formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setShowForm(false);
      setDivisionFormat("pool_to_bracket");
    }
    setLoading(false);
  }

  async function handleRemove(divisionId: string) {
    await removeDivision(tournamentId, divisionId);
  }

  return (
    <div className="space-y-4">
      {divisions.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No divisions configured yet.
            </p>
            {isOrganizer && isDraft && (
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => setShowForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Division
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {divisions.map((div) => (
              <Card key={div.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{div.name}</CardTitle>
                    {isOrganizer && isDraft && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRemove(div.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {div.format.replace(/_/g, " ")}
                    </Badge>
                    {div.teamCap && (
                      <span className="text-xs text-muted-foreground">
                        Max {div.teamCap} teams
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {isOrganizer && isDraft && !showForm && (
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Division
            </Button>
          )}
        </>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Division</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleAdd} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="div-name">Name</Label>
                <Input
                  id="div-name"
                  name="name"
                  placeholder="Men's A"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="div-format">Format</Label>
                <Select
                  name="format"
                  value={divisionFormat}
                  onValueChange={(value) =>
                    setDivisionFormat(value ?? "pool_to_bracket")
                  }
                >
                  <SelectTrigger id="div-format">
                    <SelectValue>{formatLabel[divisionFormat]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pool_to_bracket">
                      Pool Play to Bracket
                    </SelectItem>
                    <SelectItem value="single_elimination">
                      Single Elimination
                    </SelectItem>
                    <SelectItem value="double_elimination">
                      Double Elimination
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="div-cap">Team Cap (optional)</Label>
                <Input
                  id="div-cap"
                  name="teamCap"
                  type="number"
                  placeholder="4"
                  min={2}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add Division"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
