import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DashboardContentEnter } from "@/components/layout/dashboard-content-enter";
import { RouteFade } from "@/components/layout/route-fade";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getUserSchoolSummary } from "@/lib/schools/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const admin = isAdmin(user);
  const mySchool = user ? await getUserSchoolSummary(user.id) : null;
  const schoolsHref = mySchool ? `/schools/${mySchool.slug}` : undefined;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header isAdmin={admin} schoolsHref={schoolsHref} />
      <Suspense fallback={null}>
        <DashboardContentEnter>
          <Sidebar isAdmin={admin} schoolsHref={schoolsHref} />
          <main className="flex-1 overflow-y-scroll overflow-x-hidden p-4 [scrollbar-gutter:stable] md:p-6">
            <RouteFade>{children}</RouteFade>
          </main>
        </DashboardContentEnter>
      </Suspense>
      <Toaster />
    </div>
  );
}
