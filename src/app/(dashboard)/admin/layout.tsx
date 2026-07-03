import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { AdminTabs } from "./admin-tabs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-border/60">
          <ShieldAlert className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Admin
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Site-wide controls. Visible only to admins.
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="h-10 border-b border-border/60" />}>
        <AdminTabs />
      </Suspense>

      <div className="pt-2">{children}</div>
    </div>
  );
}
