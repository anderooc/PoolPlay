"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generatePoolsForDivision, generateBracketForDivision } from "./actions";

export function GenerateControls({
  tournamentId,
  divisionId,
  divisionFormat,
  hasPools,
  canAssignPools,
  poolAssignmentBlocked,
}: {
  tournamentId: string;
  divisionId: string;
  divisionFormat: string;
  hasPools: boolean;
  canAssignPools: boolean;
  poolAssignmentBlocked: string | null;
}) {
  const [poolCount, setPoolCount] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGeneratePools() {
    setLoading(true);
    setError(null);
    const result = await generatePoolsForDivision(
      tournamentId,
      divisionId,
      poolCount
    );
    if (result?.error) setError(result.error);
    setLoading(false);
  }

  async function handleGenerateBracket() {
    setLoading(true);
    setError(null);
    const result = await generateBracketForDivision(
      tournamentId,
      divisionId,
      []
    );
    if (result?.error) setError(result.error);
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Generate</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        {(divisionFormat === "pool_to_bracket" || !hasPools) && (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="poolCount">Number of Groups</Label>
              <Input
                id="poolCount"
                type="number"
                min={2}
                max={16}
                value={poolCount}
                onChange={(e) => setPoolCount(parseInt(e.target.value, 10))}
                className="w-20"
              />
            </div>
            <Button
              onClick={handleGeneratePools}
              disabled={loading || !canAssignPools}
              title={poolAssignmentBlocked ?? undefined}
            >
              {loading ? "Generating..." : "Generate Groups"}
            </Button>
          </div>
        )}

        {(divisionFormat === "single_elimination" ||
          divisionFormat === "double_elimination") && (
          <Button onClick={handleGenerateBracket} disabled={loading}>
            {loading ? "Generating..." : "Generate Bracket"}
          </Button>
        )}

        {!canAssignPools && poolAssignmentBlocked && (
          <p className="text-sm text-muted-foreground w-full">
            {poolAssignmentBlocked}
          </p>
        )}

        {error && <p className="text-sm text-destructive w-full">{error}</p>}
      </CardContent>
    </Card>
  );
}
