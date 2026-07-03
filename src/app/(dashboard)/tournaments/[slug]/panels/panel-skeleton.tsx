import { Skeleton } from "@/components/ui/skeleton";

export function TournamentPanelSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-2/3" />
    </div>
  );
}
