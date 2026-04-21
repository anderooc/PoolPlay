import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DashboardContentEnter } from "@/components/layout/dashboard-content-enter";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <Suspense fallback={null}>
        <DashboardContentEnter>
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </DashboardContentEnter>
      </Suspense>
      <Toaster />
    </div>
  );
}
