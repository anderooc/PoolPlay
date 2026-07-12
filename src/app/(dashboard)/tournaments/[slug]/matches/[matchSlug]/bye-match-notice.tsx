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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ByeMatchNotice({ teamName }: { teamName: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">First-round bye</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">{teamName}</span> received
          a bye and was advanced to the next round automatically.
        </p>
        <p>No match was played — there is nothing to score or schedule here.</p>
      </CardContent>
    </Card>
  );
}
