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
