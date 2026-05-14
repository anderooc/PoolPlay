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
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Site-wide controls. Visible only to admins.
          </p>
        </div>
      </div>

      <AdminTabs />

      <div>{children}</div>
    </div>
  );
}
