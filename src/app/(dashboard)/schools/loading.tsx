import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SchoolsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg sm:w-32" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-full">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-44" />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Skeleton className="h-5 w-16 rounded-4xl" />
                <Skeleton className="h-5 w-20 rounded-4xl" />
                <Skeleton className="h-5 w-24 rounded-4xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
