"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users, Trophy, Group, Flag, Gauge, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminTabUrl, parseAdminTab, type AdminTabId } from "./constants";

const adminNav: {
  tab: AdminTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { tab: "overview", label: "Overview", icon: Gauge },
  { tab: "users", label: "Users", icon: Users },
  { tab: "tournaments", label: "Tournaments", icon: Trophy },
  { tab: "schools", label: "Schools", icon: Building2 },
  { tab: "teams", label: "Teams", icon: Group },
  { tab: "flags", label: "Content flags", icon: Flag },
];

export function AdminTabs() {
  const searchParams = useSearchParams();
  const activeTab = parseAdminTab(searchParams.get("tab") ?? undefined);

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-border/60 pb-2 text-sm"
      aria-label="Admin sections"
    >
      {adminNav.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.tab;
        return (
          <Link
            key={item.tab}
            href={adminTabUrl(item.tab)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "text-primary-foreground" : "text-current"
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
