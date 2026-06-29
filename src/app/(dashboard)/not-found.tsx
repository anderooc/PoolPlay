import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Keeps dashboard chrome (header + sidebar from the parent layout) when a
 * protected route calls notFound(), so browser back navigation does not
 * land on a bare root 404 page.
 */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This page does not exist or you do not have access to it.
        </p>
      </div>
      <Button render={<Link href="/dashboard" />}>Back to dashboard</Button>
    </div>
  );
}
